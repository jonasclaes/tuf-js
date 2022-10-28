import * as fs from 'fs';
import * as path from 'path';
import { MetadataKind } from './models';
import { TrustedMetadataSet } from './trusted_metadata_set';
import { updaterConfig } from './utils/config';

interface UodaterOptions {
  metadataDir: string;
  metadataBaseUrl: string;
  targetDir?: string;
  targetBaseUrl?: string;
}

export class Updater {
  private dir: string;
  private metadataBaseUrl: string;
  private targetDir?: string;
  private targetBaseUrl?: string;
  private trustedSet: TrustedMetadataSet;
  private config: typeof updaterConfig;

  constructor(options: UodaterOptions) {
    const { metadataDir, metadataBaseUrl, targetDir, targetBaseUrl } = options;

    this.dir = metadataDir;
    this.metadataBaseUrl = metadataBaseUrl;

    this.targetDir = targetDir;
    this.targetBaseUrl = targetBaseUrl;

    const data = this.loadLocalMetadata('1.root');
    this.trustedSet = new TrustedMetadataSet(data);
    this.config = updaterConfig;

    // self._trusted_set = trusted_metadata_set.TrustedMetadataSet(data)
    // self._fetcher = fetcher or requests_fetcher.RequestsFetcher()
    // self.config = config or UpdaterConfig()
  }

  public async refresh() {
    await this.loadRoot();
    await this.loadTimestamp();
    await this.loadSnapshot();
    await this.loadTargets(MetadataKind.Targets, MetadataKind.Root);
  }

  private loadLocalMetadata(fileName: string): Buffer {
    const filePath = path.join(this.dir, `${fileName}.json`);
    return fs.readFileSync(filePath);
  }

  private async loadRoot() {
    // Load remote root metadata.
    // Sequentially load and persist on local disk every newer root metadata
    // version available on the remote.
    console.log('Loading root metadata');
    const rootVersion = this.trustedSet.root.signed.version;

    const lowerBound = rootVersion + 1;
    const upperBound = lowerBound + this.config.maxRootRotations;

    for (let version = lowerBound; version <= upperBound; version++) {
      const url = `${this.metadataBaseUrl}/${version}.root.json`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          break;
        }
        const bytesData = Buffer.from(await response.arrayBuffer());
        this.trustedSet.updateRoot(bytesData);
        this.persistMetadata(MetadataKind.Root, bytesData);
      } catch (error) {
        console.log('error', error);
        break;
      }
    }

    console.log('--------------------------------');
  }

  private async loadTimestamp() {
    console.log('Loading timestamp metadata');

    // Load local and remote timestamp metadata
    try {
      const data = this.loadLocalMetadata(MetadataKind.Timestamp);
      this.trustedSet.updateTimestamp(data);
    } catch (error) {
      console.error('Cannot load local timestamp metadata');
    }

    //Load from remote (whether local load succeeded or not)
    const url = `${this.metadataBaseUrl}/timestamp.json`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        return;
      }
      const bytesData = Buffer.from(await response.arrayBuffer());
      this.trustedSet.updateTimestamp(bytesData);
      this.persistMetadata(MetadataKind.Timestamp, bytesData);
    } catch (error) {
      console.log('error', error);
    }
    console.log('--------------------------------');
  }

  private async loadSnapshot() {
    console.log('Loading snapshot metadata');
    //Load local (and if needed remote) snapshot metadata
    try {
      const data = this.loadLocalMetadata(MetadataKind.Snapshot);
      this.trustedSet.updateSnapshot(data, true);
      console.log('Local snapshot is valid: not downloading new one');
    } catch (error) {
      console.log('Local snapshot is invalid: downloading new one');
      if (!this.trustedSet.timestamp) {
        throw new Error('No timestamp metadata');
      }
      const snapshotMeta = this.trustedSet.timestamp.signed.snapshotMeta;
      // TODO: use length for fetching
      // const length = snapshotMeta.length || this.config.snapshotMaxLength;

      const version = this.trustedSet.root.signed.consistentSnapshot
        ? snapshotMeta.version
        : undefined;

      const url = version
        ? `${this.metadataBaseUrl}/${version}.snapshot.json`
        : `${this.metadataBaseUrl}/snapshot.json`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          return;
        }
        const bytesData = Buffer.from(await response.arrayBuffer());

        this.trustedSet.updateSnapshot(bytesData);
        this.persistMetadata(MetadataKind.Snapshot, bytesData);
      } catch (error) {
        console.log('error', error);
      }
    }
    console.log('--------------------------------');
  }

  private async loadTargets(role: MetadataKind, parentRole: MetadataKind) {
    console.log(`Loading ${role} metadata`);

    if (this.trustedSet?.[role]) {
      return this.trustedSet?.[role];
    }

    try {
      const buffer = this.loadLocalMetadata(role);
      this.trustedSet.updateDelegatedTargets(buffer, role, parentRole);
      console.log('Local %s is valid: not downloading new one', role);
    } catch (error) {
      // Local 'role' does not exist or is invalid: update from remote
      console.log('Local %s is invalid: downloading new one', role);

      if (!this.trustedSet.snapshot) {
        throw new Error('No snapshot metadata');
      }

      const metaInfo = this.trustedSet.snapshot.signed.meta[`${role}.json`];

      // TODO: use length for fetching
      // const length = metaInfo.length || this.config.targetsMaxLength;

      const version = this.trustedSet.root.signed.consistentSnapshot
        ? metaInfo.version
        : undefined;

      const url = version
        ? `${this.metadataBaseUrl}/${version}.${role}.json`
        : `${this.metadataBaseUrl}/${role}.json`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          return;
        }
        const bytesData = Buffer.from(await response.arrayBuffer());

        this.trustedSet.updateDelegatedTargets(bytesData, role, parentRole);
        this.persistMetadata(role, bytesData);
      } catch (error) {
        console.log('error', error);
      }
    }
    console.log('--------------------------------');
  }

  private async persistMetadata(metaDataName: MetadataKind, bytesData: Buffer) {
    try {
      const filePath = path.join(this.dir, `${metaDataName}.json`);
      fs.writeFileSync(filePath, bytesData.toString('utf8'));
    } catch (error) {
      console.error('persistMetadata error', error);
    }
  }
}

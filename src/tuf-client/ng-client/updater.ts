import * as fs from 'fs';
import * as path from 'path';
import { MetadataKind } from '../api/metadata';
import { updaterConfig } from '../utils/config';
import { JSONObject } from '../utils/type';
import { TrustedMetadataSet } from './internal/trustedMetadataSet';

interface UpdateOptions {
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
  private trustedSet?: TrustedMetadataSet;
  private config?: typeof updaterConfig;

  constructor(options: UpdateOptions) {
    const { metadataDir, metadataBaseUrl, targetDir, targetBaseUrl } = options;

    this.dir = metadataDir;
    this.metadataBaseUrl = metadataBaseUrl;

    this.targetDir = targetDir;
    this.targetBaseUrl = targetBaseUrl;

    const data = this.loadLocalMetadata(MetadataKind.Root);
    this.trustedSet = new TrustedMetadataSet(data);
    this.config = updaterConfig;

    // self._trusted_set = trusted_metadata_set.TrustedMetadataSet(data)
    // self._fetcher = fetcher or requests_fetcher.RequestsFetcher()
    // self.config = config or UpdaterConfig()
  }

  private loadLocalMetadata(role: MetadataKind): JSONObject {
    const filePath = path.join(this.dir, `${role}.json`);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  private loadRoot() {
    // Load remote root metadata.
    // Sequentially load and persist on local disk every newer root metadata
    // version available on the remote.
  }
}

import util from 'util';
import { JSONValue } from '../utils/type';

interface RoleOptions {
  keyIDs: string[];
  threshold: number;
  unrecognizedFields?: Record<string, JSONValue>;
}

export class Role {
  readonly keyIDs: string[];
  readonly threshold: number;
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  private unrecognizedFields?: Record<string, any>;

  constructor(options: RoleOptions) {
    const { keyIDs, threshold, unrecognizedFields } = options;

    const keyIDSet = new Set(keyIDs);
    if (keyIDSet.size !== keyIDs.length) {
      throw new Error('Duplicate key IDs found');
    }

    if (threshold < 1) {
      throw new Error('Threshold must be at least 1');
    }

    this.keyIDs = keyIDs;
    this.threshold = threshold;
    this.unrecognizedFields = unrecognizedFields || {};
  }

  public equals(other: Role): boolean {
    if (!(other instanceof Role)) {
      return false;
    }

    return (
      util.isDeepStrictEqual(this.keyIDs, other.keyIDs) &&
      this.threshold === other.threshold &&
      util.isDeepStrictEqual(this.unrecognizedFields, other.unrecognizedFields)
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static fromJSON(data: any): Role {
    const { keyids, threshold, ...rest } = data;

    if (!Array.isArray(keyids)) {
      throw new Error('keyids must be an array');
    }

    if (typeof threshold !== 'number') {
      throw new Error('threshold must be a number');
    }

    return new Role({
      keyIDs: keyids as string[],
      threshold,
      unrecognizedFields: rest,
    });
  }
}

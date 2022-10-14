/* eslint-disable @typescript-eslint/no-explicit-any */
import { Role } from './role';

describe('Role', () => {
  describe('constructor', () => {
    describe('when called with valid arguments', () => {
      const opts = { keyIDs: ['a'], threshold: 2 };
      it('constructs an object', () => {
        const role = new Role(opts);
        expect(role).toBeTruthy();
        expect(role.keyIDs).toEqual(opts.keyIDs);
        expect(role.threshold).toEqual(opts.threshold);
      });
    });

    describe('when called with duplicate key IDs', () => {
      const opts = { keyIDs: ['a', 'a'], threshold: 1 };
      it('throws an error', () => {
        expect(() => new Role(opts)).toThrow('Duplicate key IDs found');
      });
    });

    describe('when called with threshold less than 1', () => {
      const opts = { keyIDs: [], threshold: 0 };
      it('throws an error', () => {
        expect(() => new Role(opts)).toThrow('Threshold must be at least 1');
      });
    });
  });

  describe('fromJSON', () => {
    describe('when keyids is not an array', () => {
      const json = { keyids: 'a', threshold: 1 };
      it('throws an error', () => {
        expect(() => Role.fromJSON(json)).toThrowError(
          'keyids must be an array'
        );
      });
    });

    describe('when threshold is not a number', () => {
      const json = { keyids: [], threshold: 'foo' };
      it('throws an error', () => {
        expect(() => Role.fromJSON(json)).toThrowError(
          'threshold must be a number'
        );
      });
    });

    describe('when called with valid arguments', () => {
      const json = { keyids: ['a'], threshold: 1 };
      it('constructs an object', () => {
        const role = Role.fromJSON(json);
        expect(role).toBeTruthy();
        expect(role.keyIDs).toEqual(json.keyids);
        expect(role.threshold).toEqual(json.threshold);
      });
    });
  });

  describe('equals', () => {
    const opts = {
      keyIDs: ['a'],
      threshold: 1,
      unrecognizedFields: { foo: 'bar' },
    };
    const role = new Role(opts);
    describe('when called with a non-Role object', () => {
      it('returns false', () => {
        expect(role.equals({} as any)).toBeFalsy();
      });
    });

    describe('when called with a Role object with different key IDs', () => {
      const other = new Role({ ...opts, keyIDs: ['b'] });
      it('returns false', () => {
        expect(role.equals(other)).toBeFalsy();
      });
    });

    describe('when called with a Role object with different threshold', () => {
      const other = new Role({ ...opts, threshold: 2 });
      it('returns false', () => {
        expect(role.equals(other)).toBeFalsy();
      });
    });

    describe('when called with a Role object with different unrecognized fields', () => {
      const other = new Role({ ...opts, unrecognizedFields: { bar: 'foo' } });
      it('returns false', () => {
        expect(role.equals(other)).toBeFalsy();
      });
    });

    describe('when called with a Role object with the same properties', () => {
      const other = new Role(opts);
      it('returns true', () => {
        expect(role.equals(other)).toBeTruthy();
      });
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validate } from './location.js';

describe('Location.validate', () => {
    it('returns lat/lon for valid coordinates', () => {
        const result = validate(51.5074, -0.1278);
        assert.deepEqual(result, { lat: 51.5074, lon: -0.1278 });
    });

    it('parses string inputs', () => {
        const result = validate('48.8566', '2.3522');
        assert.deepEqual(result, { lat: 48.8566, lon: 2.3522 });
    });

    it('returns null for NaN', () => {
        assert.equal(validate('abc', 'xyz'), null);
    });

    it('returns null for out-of-range latitude', () => {
        assert.equal(validate(91, 0), null);
        assert.equal(validate(-91, 0), null);
    });

    it('returns null for out-of-range longitude', () => {
        assert.equal(validate(0, 181), null);
        assert.equal(validate(0, -181), null);
    });

    it('accepts boundary values', () => {
        assert.ok(validate(90, 180));
        assert.ok(validate(-90, -180));
    });
});

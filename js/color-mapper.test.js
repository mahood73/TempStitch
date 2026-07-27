import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    rgbToHex,
    generateColourScale,
    calculateSmartDefaults,
    buildColourKey,
    getColor,
    palettes,
} from './color-mapper.js';

describe('rgbToHex', () => {
    it('converts RGB to hex string', () => {
        assert.equal(rgbToHex([255, 0, 0]), '#ff0000');
        assert.equal(rgbToHex([0, 255, 0]), '#00ff00');
        assert.equal(rgbToHex([0, 0, 255]), '#0000ff');
        assert.equal(rgbToHex([0, 0, 0]), '#000000');
        assert.equal(rgbToHex([255, 255, 255]), '#ffffff');
    });
});

describe('generateColourScale', () => {
    it('returns correct number of colours', () => {
        const scale = generateColourScale('default', 5);
        assert.equal(scale.length, 5);
    });

    it('returns all hex strings', () => {
        const scale = generateColourScale('default', 10);
        for (const hex of scale) {
            assert.match(hex, /^#[0-9a-f]{6}$/);
        }
    });

    it('handles single colour', () => {
        const scale = generateColourScale('default', 1);
        assert.equal(scale.length, 1);
    });

    it('falls back to default palette for unknown name', () => {
        const scale = generateColourScale('nonexistent', 5);
        const defaultScale = generateColourScale('default', 5);
        assert.deepEqual(scale, defaultScale);
    });
});

describe('calculateSmartDefaults', () => {
    it('floors min and ceils max', () => {
        const result = calculateSmartDefaults(5.3, 15.7, 10);
        assert.equal(result.min, 5);
        assert.equal(result.max, 16);
    });

    it('handles zero range', () => {
        const result = calculateSmartDefaults(10, 10, 10);
        assert.equal(result.min, 5);
        assert.equal(result.max, 15);
    });
});

describe('buildColourKey', () => {
    it('returns correct number of entries', () => {
        const key = buildColourKey(0, 30, 10, 'default');
        assert.equal(key.length, 10);
    });

    it('each entry has required fields', () => {
        const key = buildColourKey(0, 30, 5, 'default');
        for (const entry of key) {
            assert.ok(typeof entry.index === 'number');
            assert.ok(typeof entry.name === 'string');
            assert.ok(typeof entry.min === 'number');
            assert.ok(typeof entry.max === 'number');
            assert.ok(typeof entry.label === 'string');
            assert.ok(typeof entry.colour === 'string');
        }
    });

    it('entries are sequentially indexed', () => {
        const key = buildColourKey(0, 40, 8, 'default');
        const indices = key.map(e => e.index);
        assert.deepEqual(indices, [1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('ranges are contiguous', () => {
        const key = buildColourKey(0, 10, 5, 'default');
        for (let i = 1; i < key.length; i++) {
            assert.equal(key[i].min, key[i - 1].max);
        }
    });
});

describe('getColor', () => {
    it('returns matching colour entry for temp in range', () => {
        const key = buildColourKey(0, 100, 10, 'default');
        const entry = getColor(25, key);
        assert.ok(entry.min <= 25);
        assert.ok(entry.max > 25);
    });

    it('returns last entry for temp at max boundary', () => {
        const key = buildColourKey(0, 10, 5, 'default');
        const last = key[key.length - 1];
        const entry = getColor(last.max, key);
        assert.equal(entry.index, last.index);
    });
});

describe('palettes', () => {
    it('has all expected palette names', () => {
        assert.ok(palettes.default);
        assert.ok(palettes.warm);
        assert.ok(palettes.cool);
        assert.ok(palettes.pastel);
        assert.ok(palettes.monochrome);
    });

    it('each palette has at least 2 base colours', () => {
        for (const [name, colours] of Object.entries(palettes)) {
            assert.ok(colours.length >= 2, `palette "${name}" needs at least 2 colours`);
        }
    });
});

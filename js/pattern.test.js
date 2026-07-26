import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { generate } from './pattern.js';

function mockWeatherData(temps) {
    return {
        days: temps.map((temp, i) => ({
            date: `2024-01-${String(i + 1).padStart(2, '0')}`,
            temp,
        })),
        meta: { latitude: 51.5, longitude: -0.1, elevation: 11, timezone: 'GMT', generationMs: 1 },
    };
}

describe('Pattern.generate', () => {
    it('produces rows matching input days', () => {
        const data = mockWeatherData([5, 10, 15, 20, 25]);
        const pattern = generate(data);
        assert.equal(pattern.rows.length, 5);
    });

    it('each row has date, temp, colour, colourIndex, colourName, stitches', () => {
        const data = mockWeatherData([5, 10, 15]);
        const pattern = generate(data, { stitchCount: 40 });
        for (const row of pattern.rows) {
            assert.ok(row.date);
            assert.ok(typeof row.temp === 'number');
            assert.ok(typeof row.colour === 'string');
            assert.ok(typeof row.colourIndex === 'number');
            assert.ok(typeof row.colourName === 'string');
            assert.equal(row.stitches, 40);
        }
    });

    it('stats include min, max, avg, totalDays', () => {
        const data = mockWeatherData([5, 10, 15, 20, 25]);
        const pattern = generate(data);
        assert.equal(pattern.stats.minTemp, 5);
        assert.equal(pattern.stats.maxTemp, 25);
        assert.equal(pattern.stats.totalDays, 5);
        assert.equal(pattern.stats.avgTemp, 15);
    });

    it('colourKey has correct number of entries', () => {
        const data = mockWeatherData([5, 10, 15, 20, 25]);
        const pattern = generate(data, { numColours: 5 });
        assert.equal(pattern.colourKey.length, 5);
    });

    it('instructions start with cast-on for knit', () => {
        const data = mockWeatherData([5, 10, 15]);
        const pattern = generate(data, { craftType: 'knit' });
        assert.match(pattern.instructions[0], /^Cast on \d+ stitches/);
    });

    it('instructions start with chain for crochet', () => {
        const data = mockWeatherData([5, 10, 15]);
        const pattern = generate(data, { craftType: 'crochet' });
        assert.match(pattern.instructions[0], /^Chain \d+/);
    });

    it('uses UK terminology by default', () => {
        const data = mockWeatherData([5, 10, 15]);
        const pattern = generate(data, { craftType: 'knit' });
        const last = pattern.instructions[pattern.instructions.length - 1];
        assert.equal(last, 'Cast off.');
    });

    it('uses US terminology when specified', () => {
        const data = mockWeatherData([5, 10, 15]);
        const pattern = generate(data, { craftType: 'knit', terminology: 'us' });
        const last = pattern.instructions[pattern.instructions.length - 1];
        assert.equal(last, 'Bind off.');
    });

    it('options are preserved in output', () => {
        const data = mockWeatherData([5, 10, 15]);
        const pattern = generate(data, {
            craftType: 'crochet',
            stitchCount: 80,
            paletteName: 'warm',
            numColours: 6,
        });
        assert.equal(pattern.options.craftType, 'crochet');
        assert.equal(pattern.options.stitchCount, 80);
        assert.equal(pattern.options.paletteName, 'warm');
        assert.equal(pattern.options.numColours, 6);
    });

    it('respects colourKeyMin/Max overrides', () => {
        const data = mockWeatherData([10, 20, 30]);
        const pattern = generate(data, { colourKeyMin: 0, colourKeyMax: 50, numColours: 5 });
        assert.equal(pattern.colourKey[0].min, 0);
        assert.equal(pattern.colourKey[pattern.colourKey.length - 1].max, 50);
    });
});

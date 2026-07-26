import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { generate } from './pattern.js';
import { createDateRange, createWeatherRequest } from './weather-dataset.js';

function mockDataset(temps) {
    const dateRange = createDateRange('2024-01-01', `2024-01-${String(temps.length).padStart(2, '0')}`);
    const request = createWeatherRequest('Test', 51.5, -0.1, dateRange, 'celsius');
    return {
        request,
        observations: temps.map((temp, i) => ({
            date: `2024-01-${String(i + 1).padStart(2, '0')}`,
            temp,
        })),
        provenance: {
            source: 'Open-Meteo',
            measurement: 'temperature_2m_max',
            temperatureUnit: 'celsius',
            timezone: 'GMT',
            latitude: 51.5,
            longitude: -0.1,
            requestedDateRange: dateRange,
            returnedDateRange: dateRange,
        },
    };
}

describe('Pattern.generate', () => {
    it('produces rows matching input observations', () => {
        const dataset = mockDataset([5, 10, 15, 20, 25]);
        const pattern = generate(dataset);
        assert.equal(pattern.rows.length, 5);
    });

    it('each row has date, temp, colour, colourIndex, colourName, stitches', () => {
        const dataset = mockDataset([5, 10, 15]);
        const pattern = generate(dataset, { stitchCount: 40 });
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
        const dataset = mockDataset([5, 10, 15, 20, 25]);
        const pattern = generate(dataset);
        assert.equal(pattern.stats.minTemp, 5);
        assert.equal(pattern.stats.maxTemp, 25);
        assert.equal(pattern.stats.totalDays, 5);
        assert.equal(pattern.stats.avgTemp, 15);
    });

    it('colourKey has correct number of entries', () => {
        const dataset = mockDataset([5, 10, 15, 20, 25]);
        const pattern = generate(dataset, { numColours: 5 });
        assert.equal(pattern.colourKey.length, 5);
    });

    it('instructions start with cast-on for knit', () => {
        const dataset = mockDataset([5, 10, 15]);
        const pattern = generate(dataset, { craftType: 'knit' });
        assert.match(pattern.instructions[0], /^Cast on \d+ stitches/);
    });

    it('instructions start with chain for crochet', () => {
        const dataset = mockDataset([5, 10, 15]);
        const pattern = generate(dataset, { craftType: 'crochet' });
        assert.match(pattern.instructions[0], /^Chain \d+/);
    });

    it('uses UK terminology by default', () => {
        const dataset = mockDataset([5, 10, 15]);
        const pattern = generate(dataset, { craftType: 'knit' });
        const last = pattern.instructions[pattern.instructions.length - 1];
        assert.equal(last, 'Cast off.');
    });

    it('uses US terminology when specified', () => {
        const dataset = mockDataset([5, 10, 15]);
        const pattern = generate(dataset, { craftType: 'knit', terminology: 'us' });
        const last = pattern.instructions[pattern.instructions.length - 1];
        assert.equal(last, 'Bind off.');
    });

    it('reads tempUnit from dataset request', () => {
        const dateRange = createDateRange('2024-01-01', '2024-01-03');
        const request = createWeatherRequest('Test', 51.5, -0.1, dateRange, 'fahrenheit');
        const dataset = {
            request,
            observations: [
                { date: '2024-01-01', temp: 32 },
                { date: '2024-01-02', temp: 35 },
                { date: '2024-01-03', temp: 38 },
            ],
            provenance: { source: 'Open-Meteo', measurement: 'temperature_2m_max', temperatureUnit: 'fahrenheit', timezone: 'GMT', latitude: 51.5, longitude: -0.1, requestedDateRange: dateRange, returnedDateRange: dateRange },
        };
        const pattern = generate(dataset);
        assert.equal(pattern.options.tempUnit, 'fahrenheit');
    });

    it('options are preserved in output', () => {
        const dataset = mockDataset([5, 10, 15]);
        const pattern = generate(dataset, {
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
        const dataset = mockDataset([10, 20, 30]);
        const pattern = generate(dataset, { colourKeyMin: 0, colourKeyMax: 50, numColours: 5 });
        assert.equal(pattern.colourKey[0].min, 0);
        assert.equal(pattern.colourKey[pattern.colourKey.length - 1].max, 50);
    });

    it('includes dateRange in options from dataset', () => {
        const dataset = mockDataset([5, 10, 15]);
        const pattern = generate(dataset);
        assert.deepEqual(pattern.options.dateRange, { start: '2024-01-01', end: '2024-01-03' });
    });
});

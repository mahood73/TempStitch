import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

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

describe('Project generation', () => {
    it('produces a project with dataset, settings, design, and pattern', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset);
        assert.ok(project.dataset);
        assert.ok(project.settings);
        assert.ok(project.design);
        assert.ok(project.pattern);
    });

    it('dataset is the original weather dataset', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset);
        assert.strictEqual(project.dataset, dataset);
    });

    it('returns a deeply immutable Project aggregate while preserving dataset identity', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset);
        assert.strictEqual(project.dataset, dataset);
        assert.ok(Object.isFrozen(project));
        assert.ok(Object.isFrozen(project.dataset));
        assert.ok(Object.isFrozen(project.dataset.request.location));
        assert.ok(Object.isFrozen(project.dataset.observations[0]));
        assert.ok(Object.isFrozen(project.settings));
        assert.ok(Object.isFrozen(project.design.bands));
        assert.ok(Object.isFrozen(project.pattern.rows));
        assert.ok(Object.isFrozen(project.pattern.instructions));
    });

    it('settings snapshot contains form values', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset, { craftType: 'crochet', stitchCount: 80, paletteName: 'warm', numColours: 6 });
        assert.equal(project.settings.craftType, 'crochet');
        assert.equal(project.settings.stitchCount, 80);
        assert.equal(project.settings.paletteName, 'warm');
        assert.equal(project.settings.numColours, 6);
    });

    it('design owns bands, colourKey, stats, and bounds', () => {
        const dataset = mockDataset([5, 10, 15, 20, 25]);
        const project = generate(dataset, { numColours: 5 });
        assert.equal(project.design.bands.length, 5);
        assert.equal(project.design.colourKey.length, 5);
        assert.equal(project.design.stats.minTemp, 5);
        assert.equal(project.design.stats.maxTemp, 25);
        assert.equal(project.design.stats.totalDays, 5);
        assert.equal(typeof project.design.min, 'number');
        assert.equal(typeof project.design.max, 'number');
        assert.equal(project.design.tempUnit, 'celsius');
    });

    it('bands have no stitches property', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset, { stitchCount: 40 });
        for (const band of project.design.bands) {
            assert.ok(band.date);
            assert.ok(typeof band.temp === 'number');
            assert.ok(typeof band.colour === 'string');
            assert.ok(typeof band.colourIndex === 'number');
            assert.ok(typeof band.colourName === 'string');
            assert.equal(band.stitches, undefined);
        }
    });

    it('pattern owns rows and instructions', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset, { stitchCount: 40 });
        assert.equal(project.pattern.rows.length, 3);
        assert.ok(Array.isArray(project.pattern.instructions));
        for (const row of project.pattern.rows) {
            assert.equal(row.stitches, 40);
            assert.ok(row.date);
            assert.ok(typeof row.temp === 'number');
        }
    });

    it('rows are derived from bands with stitch count added', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset, { stitchCount: 60 });
        for (let i = 0; i < project.design.bands.length; i++) {
            const band = project.design.bands[i];
            const row = project.pattern.rows[i];
            assert.equal(row.date, band.date);
            assert.equal(row.temp, band.temp);
            assert.equal(row.colour, band.colour);
            assert.equal(row.colourIndex, band.colourIndex);
            assert.equal(row.colourName, band.colourName);
            assert.equal(row.stitches, 60);
        }
    });
});

describe('Pattern generation', () => {
    it('instructions start with cast-on for knit', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset, { craftType: 'knit' });
        assert.match(project.pattern.instructions[0], /^Cast on \d+ stitches/);
    });

    it('instructions start with chain for crochet', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset, { craftType: 'crochet' });
        assert.match(project.pattern.instructions[0], /^Chain \d+/);
    });

    it('uses UK terminology by default', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset, { craftType: 'knit' });
        const last = project.pattern.instructions[project.pattern.instructions.length - 1];
        assert.equal(last, 'Cast off.');
    });

    it('uses US terminology when specified', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset, { craftType: 'knit', terminology: 'us' });
        const last = project.pattern.instructions[project.pattern.instructions.length - 1];
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
        const project = generate(dataset);
        assert.equal(project.design.tempUnit, 'fahrenheit');
    });

    it('respects colourKeyMin/Max overrides', () => {
        const dataset = mockDataset([10, 20, 30]);
        const project = generate(dataset, { colourKeyMin: 0, colourKeyMax: 50, numColours: 5 });
        assert.equal(project.design.colourKey[0].min, 0);
        assert.equal(project.design.colourKey[project.design.colourKey.length - 1].max, 50);
    });

    it('dateRange comes from dataset request', () => {
        const dataset = mockDataset([5, 10, 15]);
        const project = generate(dataset);
        assert.deepEqual(project.dataset.request.dateRange, { start: '2024-01-01', end: '2024-01-03' });
    });

    it('preserves calendar dates and instruction labels across timezones', () => {
        const patternModule = new URL('./pattern.js', import.meta.url).href;
        const script = `
            import { generate } from ${JSON.stringify(patternModule)};
            const dataset = {
                request: { tempUnit: 'celsius' },
                observations: [
                    { date: '2024-01-01', temp: 5 },
                    { date: '2024-06-15', temp: 10 },
                    { date: '2024-12-31', temp: 15 },
                ],
            };
            const project = generate(dataset);
            console.log(JSON.stringify({
                dates: project.pattern.rows.map((row) => row.date),
                labels: project.pattern.instructions.slice(1, -1).map((line) => line.match(/\\(([^)]+)\\):/)[1]),
            }));
        `;
        const outputs = ['UTC', 'Pacific/Kiritimati', 'America/Adak'].map((timezone) => {
            const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
                encoding: 'utf8',
                env: { ...process.env, TZ: timezone },
            });
            assert.equal(result.status, 0, `${timezone} child failed: ${result.stderr}`);
            return JSON.parse(result.stdout);
        });

        assert.deepEqual(outputs, [
            {
                dates: ['2024-01-01', '2024-06-15', '2024-12-31'],
                labels: ['Jan 1', 'Jun 15', 'Dec 31'],
            },
            {
                dates: ['2024-01-01', '2024-06-15', '2024-12-31'],
                labels: ['Jan 1', 'Jun 15', 'Dec 31'],
            },
            {
                dates: ['2024-01-01', '2024-06-15', '2024-12-31'],
                labels: ['Jan 1', 'Jun 15', 'Dec 31'],
            },
        ]);
    });
});

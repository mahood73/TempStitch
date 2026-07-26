import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { composeImageFilename, composeInstructionsText } from './export.js';
import { generate } from './pattern.js';
import { createDateRange, createWeatherRequest } from './weather-dataset.js';

function mockProject(overrides = {}) {
    const temps = overrides.temps || [5, 10, 15];
    const dateRange = createDateRange('2024-01-01', `2024-01-${String(temps.length).padStart(2, '0')}`);
    const request = createWeatherRequest(
        overrides.displayName || 'London, England, GB',
        overrides.lat ?? 51.5,
        overrides.lon ?? -0.1,
        dateRange,
        overrides.tempUnit || 'celsius',
    );
    const dataset = {
        request,
        observations: temps.map((temp, i) => ({
            date: `2024-01-${String(i + 1).padStart(2, '0')}`,
            temp,
        })),
        provenance: {
            source: 'Open-Meteo',
            measurement: 'temperature_2m_max',
            temperatureUnit: overrides.tempUnit || 'celsius',
            timezone: 'GMT',
            latitude: overrides.lat ?? 51.5,
            longitude: overrides.lon ?? -0.1,
            requestedDateRange: dateRange,
            returnedDateRange: dateRange,
        },
    };
    return generate(dataset, {
        craftType: overrides.craftType || 'knit',
        stitchCount: overrides.stitchCount || 50,
        numColours: overrides.numColours || 5,
        ...overrides,
    });
}

describe('composeImageFilename', () => {
    it('uses the project date range', () => {
        const project = mockProject();
        const filename = composeImageFilename(project);
        assert.equal(filename, 'tempstitch-2024-01-01-to-2024-01-03.png');
    });

    it('reflects different date ranges', () => {
        const project = mockProject({ temps: [10, 20] });
        const filename = composeImageFilename(project);
        assert.equal(filename, 'tempstitch-2024-01-01-to-2024-01-02.png');
    });

    it('does not use current date', () => {
        const project = mockProject();
        const filename = composeImageFilename(project);
        const currentYear = new Date().getFullYear();
        assert.ok(!filename.includes(String(currentYear)), 'filename should not contain current year');
    });
});

describe('composeInstructionsText', () => {
    it('starts with title and separator', () => {
        const project = mockProject();
        const text = composeInstructionsText(project);
        assert.ok(text.startsWith('TempStitch Pattern\n=================='));
    });

    it('contains craft type from project settings', () => {
        const knit = mockProject({ craftType: 'knit' });
        const crochet = mockProject({ craftType: 'crochet' });
        assert.ok(composeInstructionsText(knit).includes('Craft: Knitting'));
        assert.ok(composeInstructionsText(crochet).includes('Craft: Crochet'));
    });

    it('contains stitch count from project settings', () => {
        const project = mockProject({ stitchCount: 80 });
        const text = composeInstructionsText(project);
        assert.ok(text.includes('Stitches per row: 80'));
    });

    it('contains colour count from project settings', () => {
        const project = mockProject({ numColours: 7 });
        const text = composeInstructionsText(project);
        assert.ok(text.includes('Colours: 7'));
    });

    it('contains colour key entries', () => {
        const project = mockProject({ numColours: 3 });
        const text = composeInstructionsText(project);
        assert.ok(text.includes('Colour Key'));
        for (const entry of project.design.colourKey) {
            assert.ok(text.includes(`C${entry.index} ${entry.name}: ${entry.label}`));
        }
    });

    it('colour key entries appear in order', () => {
        const project = mockProject({ numColours: 5 });
        const text = composeInstructionsText(project);
        const keyStart = text.indexOf('Colour Key');
        const instructionsStart = text.indexOf('Instructions');
        const keySection = text.slice(keyStart, instructionsStart);
        let lastIdx = -1;
        for (const entry of project.design.colourKey) {
            const idx = keySection.indexOf(`C${entry.index}`);
            assert.ok(idx > lastIdx, `C${entry.index} should appear after previous entries`);
            lastIdx = idx;
        }
    });

    it('contains instruction lines in order', () => {
        const project = mockProject({ temps: [5, 10] });
        const text = composeInstructionsText(project);
        for (const line of project.pattern.instructions) {
            assert.ok(text.includes(line), `missing instruction: ${line}`);
        }
        const firstIdx = text.indexOf(project.pattern.instructions[0]);
        const lastIdx = text.indexOf(project.pattern.instructions[project.pattern.instructions.length - 1]);
        assert.ok(firstIdx < lastIdx, 'instructions should be in order');
    });

    it('uses the project date range, not the current date', () => {
        const project = mockProject();
        const text = composeInstructionsText(project);
        const currentYear = new Date().getFullYear();
        assert.ok(!text.includes(String(currentYear)), 'text should not contain current year');
    });

    it('preserves temperature unit', () => {
        const celsius = mockProject({ tempUnit: 'celsius' });
        const fahrenheit = mockProject({ tempUnit: 'fahrenheit' });
        const cText = composeInstructionsText(celsius);
        const fText = composeInstructionsText(fahrenheit);
        assert.ok(cText.includes('°C'));
        assert.ok(fText.includes('°F'));
    });
});

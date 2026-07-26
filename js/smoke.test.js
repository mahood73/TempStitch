import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Location from './location.js';
import * as Weather from './weather.js';
import * as ColorMapper from './color-mapper.js';
import * as Pattern from './pattern.js';
import * as Export from './export.js';

describe('Module imports', () => {
    it('location.js exports expected functions', () => {
        assert.equal(typeof Location.getSaved, 'function');
        assert.equal(typeof Location.save, 'function');
        assert.equal(typeof Location.validate, 'function');
        assert.equal(typeof Location.requestBrowserLocation, 'function');
        assert.equal(typeof Location.search, 'function');
    });

    it('weather.js exports expected functions', () => {
        assert.equal(typeof Weather.fetchDailyMax, 'function');
        assert.equal(typeof Weather.getDateRange, 'function');
    });

    it('color-mapper.js exports expected functions and palettes', () => {
        assert.equal(typeof ColorMapper.rgbToHex, 'function');
        assert.equal(typeof ColorMapper.generateColourScale, 'function');
        assert.equal(typeof ColorMapper.calculateSmartDefaults, 'function');
        assert.equal(typeof ColorMapper.buildColourKey, 'function');
        assert.equal(typeof ColorMapper.getColor, 'function');
        assert.ok(ColorMapper.palettes);
        assert.ok(ColorMapper.palettes.default);
    });

    it('pattern.js exports expected functions', () => {
        assert.equal(typeof Pattern.generate, 'function');
        assert.equal(typeof Pattern.renderGrid, 'function');
        assert.equal(typeof Pattern.renderStats, 'function');
        assert.equal(typeof Pattern.renderColourKey, 'function');
        assert.equal(typeof Pattern.renderInstructions, 'function');
    });

    it('export.js exports expected functions', () => {
        assert.equal(typeof Export.downloadImage, 'function');
        assert.equal(typeof Export.downloadInstructions, 'function');
    });
});

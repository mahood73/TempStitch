import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import * as Location from './location.js';
import * as Weather from './weather.js';
import * as WeatherDataset from './weather-dataset.js';
import * as ColorMapper from './color-mapper.js';
import * as Pattern from './pattern.js';
import * as Export from './export.js';
import * as ProjectState from './project-state.js';
import * as ProjectTypes from './project-types.js';
import * as Search from './search.js';

describe('Module imports', () => {
    it('location.js exports expected functions', () => {
        assert.equal(typeof Location.getSaved, 'function');
        assert.equal(typeof Location.save, 'function');
        assert.equal(typeof Location.validate, 'function');
        assert.equal(typeof Location.requestBrowserLocation, 'function');
        assert.equal(typeof Location.search, 'function');
    });

    it('weather.js exports expected functions', () => {
        assert.equal(typeof Weather.fetchWeather, 'function');
        assert.equal(typeof Weather.fetchUrl, 'function');
    });

    it('weather-dataset.js exports expected types and functions', () => {
        assert.equal(typeof WeatherDataset.WeatherError, 'function');
        assert.ok(WeatherDataset.WeatherErrorCategory);
        assert.equal(typeof WeatherDataset.createDateRange, 'function');
        assert.equal(typeof WeatherDataset.dateRangeFromYear, 'function');
        assert.equal(typeof WeatherDataset.countDaysInRange, 'function');
        assert.equal(typeof WeatherDataset.expandDateRange, 'function');
        assert.equal(typeof WeatherDataset.createWeatherRequest, 'function');
        assert.equal(typeof WeatherDataset.validateDataset, 'function');
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
        assert.equal(typeof Pattern.renderProject, 'function');
        assert.equal(typeof Pattern.renderGrid, 'function');
        assert.equal(typeof Pattern.renderStats, 'function');
        assert.equal(typeof Pattern.renderColourKey, 'function');
        assert.equal(typeof Pattern.renderInstructions, 'function');
    });

    it('export.js exports expected functions', () => {
        assert.equal(typeof Export.composeImageFilename, 'function');
        assert.equal(typeof Export.composeInstructionsFilename, 'function');
        assert.equal(typeof Export.composeImagePlan, 'function');
        assert.equal(typeof Export.composeInstructionsText, 'function');
        assert.equal(typeof Export.downloadImage, 'function');
        assert.equal(typeof Export.downloadInstructions, 'function');
    });

    it('project-state.js exports the Project store seam', () => {
        assert.equal(typeof ProjectState.createProjectStore, 'function');
    });

    it('project-types.js exports constants and helpers', () => {
        assert.ok(ProjectTypes.PROJECT_TYPES);
        assert.equal(ProjectTypes.PROJECT_TYPES.scarf, 'scarf');
        assert.equal(ProjectTypes.PROJECT_TYPES.blanket, 'blanket');
        assert.ok(ProjectTypes.PROJECT_TYPE_LABELS);
        assert.equal(typeof ProjectTypes.typeLabel, 'function');
        assert.equal(ProjectTypes.typeLabel('scarf'), 'Scarf');
        assert.equal(ProjectTypes.typeLabel('blanket'), 'Blanket');
    });

    it('search.js exports setupSearch', () => {
        assert.equal(typeof Search.setupSearch, 'function');
    });
});

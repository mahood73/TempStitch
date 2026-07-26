import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    WeatherError,
    WeatherErrorCategory,
    createDateRange,
    dateRangeFromYear,
    dateRangeLastDays,
    countDaysInRange,
    expandDateRange,
    createWeatherRequest,
    validateDataset,
} from './weather-dataset.js';

describe('WeatherError', () => {
    it('has category and message', () => {
        const err = new WeatherError(WeatherErrorCategory.PROVIDER_FAILURE, 'API down');
        assert.equal(err.name, 'WeatherError');
        assert.equal(err.category, 'provider-failure');
        assert.equal(err.message, 'API down');
        assert.ok(err instanceof Error);
    });
});

describe('createDateRange', () => {
    it('creates a valid date range', () => {
        const range = createDateRange('2024-01-01', '2024-12-31');
        assert.deepEqual(range, { start: '2024-01-01', end: '2024-12-31' });
    });

    it('allows single-day range', () => {
        const range = createDateRange('2024-06-15', '2024-06-15');
        assert.deepEqual(range, { start: '2024-06-15', end: '2024-06-15' });
    });

    it('rejects start after end', () => {
        assert.throws(() => createDateRange('2024-12-31', '2024-01-01'), WeatherError);
    });

    it('rejects invalid date format', () => {
        assert.throws(() => createDateRange('01-01-2024', '2024-12-31'), WeatherError);
    });

    it('rejects non-existent dates', () => {
        assert.throws(() => createDateRange('2024-02-30', '2024-03-01'), WeatherError);
    });
});

describe('dateRangeFromYear', () => {
    it('returns full non-leap year', () => {
        const range = dateRangeFromYear(2023);
        assert.deepEqual(range, { start: '2023-01-01', end: '2023-12-31' });
        assert.equal(countDaysInRange(range), 365);
    });

    it('returns full leap year', () => {
        const range = dateRangeFromYear(2024);
        assert.deepEqual(range, { start: '2024-01-01', end: '2024-12-31' });
        assert.equal(countDaysInRange(range), 366);
    });

    it('handles century non-leap year', () => {
        const range = dateRangeFromYear(1900);
        assert.equal(countDaysInRange(range), 365);
    });

    it('handles 400-year leap year', () => {
        const range = dateRangeFromYear(2000);
        assert.equal(countDaysInRange(range), 366);
    });

    it('rejects invalid year', () => {
        assert.throws(() => dateRangeFromYear(0), WeatherError);
        assert.throws(() => dateRangeFromYear(2024.5), WeatherError);
    });
});

describe('dateRangeLastDays', () => {
    it('returns a range of the specified length', () => {
        const range = dateRangeLastDays(365);
        assert.equal(countDaysInRange(range), 365);
        const end = new Date();
        const endStr = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`;
        assert.equal(range.end, endStr);
    });

    it('rejects non-integer days', () => {
        assert.throws(() => dateRangeLastDays(0), WeatherError);
        assert.throws(() => dateRangeLastDays(1.5), WeatherError);
    });

    it('start is before or equal to end', () => {
        const range = dateRangeLastDays(365);
        assert.ok(range.start <= range.end);
    });
});

describe('countDaysInRange', () => {
    it('counts 365 days for non-leap year', () => {
        assert.equal(countDaysInRange({ start: '2023-01-01', end: '2023-12-31' }), 365);
    });

    it('counts 366 days for leap year', () => {
        assert.equal(countDaysInRange({ start: '2024-01-01', end: '2024-12-31' }), 366);
    });

    it('counts 1 day for single day', () => {
        assert.equal(countDaysInRange({ start: '2024-06-15', end: '2024-06-15' }), 1);
    });
});

describe('expandDateRange', () => {
    it('expands single day', () => {
        assert.deepEqual(expandDateRange({ start: '2024-01-01', end: '2024-01-01' }), ['2024-01-01']);
    });

    it('expands 3 days', () => {
        assert.deepEqual(
            expandDateRange({ start: '2024-01-01', end: '2024-01-03' }),
            ['2024-01-01', '2024-01-02', '2024-01-03']
        );
    });

    it('expands across month boundary', () => {
        assert.deepEqual(
            expandDateRange({ start: '2024-01-30', end: '2024-02-02' }),
            ['2024-01-30', '2024-01-31', '2024-02-01', '2024-02-02']
        );
    });

    it('expands leap day', () => {
        assert.deepEqual(
            expandDateRange({ start: '2024-02-28', end: '2024-03-01' }),
            ['2024-02-28', '2024-02-29', '2024-03-01']
        );
    });
});

describe('createWeatherRequest', () => {
    const dateRange = createDateRange('2024-01-01', '2024-12-31');

    it('creates a valid request', () => {
        const req = createWeatherRequest('London, England, GB', 51.5, -0.1, dateRange, 'celsius');
        assert.deepEqual(req.location, { displayName: 'London, England, GB', lat: 51.5, lon: -0.1 });
        assert.deepEqual(req.dateRange, dateRange);
        assert.equal(req.tempUnit, 'celsius');
    });

    it('trims display name', () => {
        const req = createWeatherRequest('  Paris  ', 48.8566, 2.3522, dateRange, 'fahrenheit');
        assert.equal(req.location.displayName, 'Paris');
    });

    it('rejects empty display name', () => {
        assert.throws(() => createWeatherRequest('', 51.5, -0.1, dateRange, 'celsius'), WeatherError);
    });

    it('rejects invalid latitude', () => {
        assert.throws(() => createWeatherRequest('X', 91, -0.1, dateRange, 'celsius'), WeatherError);
        assert.throws(() => createWeatherRequest('X', NaN, -0.1, dateRange, 'celsius'), WeatherError);
    });

    it('rejects invalid longitude', () => {
        assert.throws(() => createWeatherRequest('X', 51.5, 181, dateRange, 'celsius'), WeatherError);
    });

    it('rejects invalid temp unit', () => {
        assert.throws(() => createWeatherRequest('X', 51.5, -0.1, dateRange, 'kelvin'), WeatherError);
    });
});

describe('validateDataset', () => {
    const request = createWeatherRequest('Test', 51.5, -0.1, createDateRange('2024-01-01', '2024-01-05'), 'celsius');
    const provenance = {
        source: 'Open-Meteo',
        measurement: 'temperature_2m_max',
        temperatureUnit: 'celsius',
        timezone: 'GMT',
        latitude: 51.5,
        longitude: -0.1,
        requestedDateRange: request.dateRange,
        returnedDateRange: request.dateRange,
    };

    it('accepts valid observations', () => {
        const obs = [
            { date: '2024-01-01', temp: 10 },
            { date: '2024-01-02', temp: 11 },
            { date: '2024-01-03', temp: 12 },
            { date: '2024-01-04', temp: 13 },
            { date: '2024-01-05', temp: 14 },
        ];
        const dataset = validateDataset(request, obs, provenance);
        assert.equal(dataset.observations.length, 5);
        assert.equal(dataset.request.location.displayName, 'Test');
        assert.equal(dataset.provenance.source, 'Open-Meteo');
    });

    it('rejects empty observations', () => {
        assert.throws(() => validateDataset(request, [], provenance), WeatherError);
    });

    it('rejects non-array observations', () => {
        assert.throws(() => validateDataset(request, null, provenance), WeatherError);
    });

    it('rejects wrong count', () => {
        const obs = [
            { date: '2024-01-01', temp: 10 },
            { date: '2024-01-02', temp: 11 },
        ];
        assert.throws(() => validateDataset(request, obs, provenance), WeatherError);
    });

    it('rejects non-finite temperature', () => {
        const obs = [
            { date: '2024-01-01', temp: NaN },
            { date: '2024-01-02', temp: 11 },
            { date: '2024-01-03', temp: 12 },
            { date: '2024-01-04', temp: 13 },
            { date: '2024-01-05', temp: 14 },
        ];
        try {
            validateDataset(request, obs, provenance);
            assert.fail('Should have thrown');
        } catch (err) {
            assert.ok(err instanceof WeatherError);
            assert.equal(err.category, WeatherErrorCategory.INCOMPLETE_COVERAGE);
        }
    });

    it('rejects Infinity temperature', () => {
        const obs = [
            { date: '2024-01-01', temp: 10 },
            { date: '2024-01-02', temp: Infinity },
            { date: '2024-01-03', temp: 12 },
            { date: '2024-01-04', temp: 13 },
            { date: '2024-01-05', temp: 14 },
        ];
        try {
            validateDataset(request, obs, provenance);
            assert.fail('Should have thrown');
        } catch (err) {
            assert.ok(err instanceof WeatherError);
            assert.equal(err.category, WeatherErrorCategory.INCOMPLETE_COVERAGE);
        }
    });

    it('rejects out-of-order dates', () => {
        const obs = [
            { date: '2024-01-02', temp: 11 },
            { date: '2024-01-01', temp: 10 },
            { date: '2024-01-03', temp: 12 },
            { date: '2024-01-04', temp: 13 },
            { date: '2024-01-05', temp: 14 },
        ];
        assert.throws(() => validateDataset(request, obs, provenance), WeatherError);
    });

    it('rejects duplicate dates', () => {
        const obs = [
            { date: '2024-01-01', temp: 10 },
            { date: '2024-01-01', temp: 11 },
            { date: '2024-01-03', temp: 12 },
            { date: '2024-01-04', temp: 13 },
            { date: '2024-01-05', temp: 14 },
        ];
        assert.throws(() => validateDataset(request, obs, provenance), WeatherError);
    });

    it('rejects date outside requested range', () => {
        const obs = [
            { date: '2023-12-31', temp: 10 },
            { date: '2024-01-02', temp: 11 },
            { date: '2024-01-03', temp: 12 },
            { date: '2024-01-04', temp: 13 },
            { date: '2024-01-05', temp: 14 },
        ];
        assert.throws(() => validateDataset(request, obs, provenance), WeatherError);
    });

    it('rejects non-object observation', () => {
        const obs = [
            '2024-01-01',
            { date: '2024-01-02', temp: 11 },
            { date: '2024-01-03', temp: 12 },
            { date: '2024-01-04', temp: 13 },
            { date: '2024-01-05', temp: 14 },
        ];
        assert.throws(() => validateDataset(request, obs, provenance), WeatherError);
    });

    it('rejects observation with invalid date format', () => {
        const obs = [
            { date: '01/01/2024', temp: 10 },
            { date: '2024-01-02', temp: 11 },
            { date: '2024-01-03', temp: 12 },
            { date: '2024-01-04', temp: 13 },
            { date: '2024-01-05', temp: 14 },
        ];
        assert.throws(() => validateDataset(request, obs, provenance), WeatherError);
    });

    it('preserves provenance fields', () => {
        const obs = [
            { date: '2024-01-01', temp: 10 },
            { date: '2024-01-02', temp: 11 },
            { date: '2024-01-03', temp: 12 },
            { date: '2024-01-04', temp: 13 },
            { date: '2024-01-05', temp: 14 },
        ];
        const dataset = validateDataset(request, obs, provenance);
        assert.equal(dataset.provenance.source, 'Open-Meteo');
        assert.equal(dataset.provenance.measurement, 'temperature_2m_max');
        assert.equal(dataset.provenance.temperatureUnit, 'celsius');
        assert.equal(dataset.provenance.timezone, 'GMT');
        assert.equal(dataset.provenance.latitude, 51.5);
        assert.equal(dataset.provenance.longitude, -0.1);
    });

    it('throws WeatherError with correct category', () => {
        try {
            validateDataset(request, [], provenance);
            assert.fail('Should have thrown');
        } catch (err) {
            assert.ok(err instanceof WeatherError);
            assert.equal(err.category, WeatherErrorCategory.INCOMPLETE_COVERAGE);
        }
    });

    it('throws malformed category for bad observation shape', () => {
        try {
            validateDataset(request, [null, null, null, null, null], provenance);
            assert.fail('Should have thrown');
        } catch (err) {
            assert.ok(err instanceof WeatherError);
            assert.equal(err.category, WeatherErrorCategory.MALFORMED_RESPONSE);
        }
    });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    DAILY_MAXIMUM_TEMPERATURE_MEASUREMENT,
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

const requestInput = {
    displayName: 'Test location',
    lat: 51.5,
    lon: -0.1,
    dateRange: { start: '2024-01-01', end: '2024-01-05' },
    tempUnit: 'celsius',
};

function makeRequest() {
    return createWeatherRequest(
        requestInput.displayName,
        requestInput.lat,
        requestInput.lon,
        requestInput.dateRange,
        requestInput.tempUnit
    );
}

function makeObservations() {
    return [
        { date: '2024-01-01', temp: 10 },
        { date: '2024-01-02', temp: 11 },
        { date: '2024-01-03', temp: 12 },
        { date: '2024-01-04', temp: 13 },
        { date: '2024-01-05', temp: 14 },
    ];
}

function makeProvenance(request, overrides = {}) {
    return {
        source: 'Open-Meteo',
        measurement: DAILY_MAXIMUM_TEMPERATURE_MEASUREMENT,
        temperatureUnit: request.tempUnit,
        timezone: 'Europe/London',
        latitude: 51.5074,
        longitude: -0.1278,
        requestedDateRange: request.dateRange,
        returnedDateRange: request.dateRange,
        ...overrides,
    };
}

function assertCategory(action, category) {
    assert.throws(action, (error) => error instanceof WeatherError && error.category === category);
}

describe('WeatherError', () => {
    it('owns a safe category message and retains an optional cause', () => {
        const cause = new Error('untrusted provider detail');
        const error = new WeatherError(WeatherErrorCategory.PROVIDER_FAILURE, cause);

        assert.equal(error.message, 'Weather service is temporarily unavailable. Please try again');
        assert.equal(error.cause, cause);
        assert.equal(error.name, 'WeatherError');
    });

    it('uses a safe fixed message for an unknown category', () => {
        assert.equal(new WeatherError('unknown').message, 'Unable to load weather data. Please try again');
    });
});

describe('Date Range', () => {
    it('creates an immutable valid date range', () => {
        const range = createDateRange('2024-01-01', '2024-12-31');
        assert.deepEqual(range, { start: '2024-01-01', end: '2024-12-31' });
        assert.ok(Object.isFrozen(range));
    });

    it('rejects malformed, nonexistent, and unordered dates', () => {
        assertCategory(() => createDateRange('01-01-2024', '2024-12-31'), WeatherErrorCategory.INVALID_REQUEST);
        assertCategory(() => createDateRange('2024-02-30', '2024-03-01'), WeatherErrorCategory.INVALID_REQUEST);
        assertCategory(() => createDateRange('2024-12-31', '2024-01-01'), WeatherErrorCategory.INVALID_REQUEST);
    });

    it('handles calendar and leap years without local-time shifts', () => {
        assert.deepEqual(dateRangeFromYear(2023), { start: '2023-01-01', end: '2023-12-31' });
        assert.equal(countDaysInRange(dateRangeFromYear(2024)), 366);
        assert.deepEqual(expandDateRange(createDateRange('2024-02-28', '2024-03-01')), [
            '2024-02-28', '2024-02-29', '2024-03-01',
        ]);
    });

    it('rejects years that cannot be represented as four-digit dates', () => {
        assertCategory(() => dateRangeFromYear(999), WeatherErrorCategory.INVALID_REQUEST);
        assertCategory(() => dateRangeFromYear(10000), WeatherErrorCategory.INVALID_REQUEST);
    });

    it('keeps dateRangeLastDays available as an explicit caller choice', () => {
        assert.equal(countDaysInRange(dateRangeLastDays(365)), 365);
    });
});

describe('createWeatherRequest', () => {
    it('normalizes and deeply freezes selected Weather Request facts', () => {
        const sourceRange = { start: '2024-01-01', end: '2024-01-05' };
        const request = createWeatherRequest('  London, GB  ', 51.5, -0.1, sourceRange, 'celsius');
        sourceRange.start = '2020-01-01';

        assert.deepEqual(request, {
            location: { displayName: 'London, GB', lat: 51.5, lon: -0.1 },
            dateRange: { start: '2024-01-01', end: '2024-01-05' },
            tempUnit: 'celsius',
        });
        assert.ok(Object.isFrozen(request));
        assert.ok(Object.isFrozen(request.location));
        assert.ok(Object.isFrozen(request.dateRange));
    });

    it('rejects invalid location, unit, and dates', () => {
        assertCategory(() => createWeatherRequest('', 51.5, -0.1, requestInput.dateRange, 'celsius'), WeatherErrorCategory.INVALID_REQUEST);
        assertCategory(() => createWeatherRequest('X', 91, -0.1, requestInput.dateRange, 'celsius'), WeatherErrorCategory.INVALID_REQUEST);
        assertCategory(() => createWeatherRequest('X', 51.5, -0.1, requestInput.dateRange, 'kelvin'), WeatherErrorCategory.INVALID_REQUEST);
    });

    it('rejects an invalid date range at the Weather boundary', () => {
        assertCategory(
            () => createWeatherRequest('X', 51.5, -0.1, { start: '2024-02-30', end: '2024-03-01' }, 'celsius'),
            WeatherErrorCategory.INVALID_REQUEST
        );
    });
});

describe('validateDataset', () => {
    it('normalizes a complete dataset and preserves only domain provenance', () => {
        const request = makeRequest();
        const rawObservations = makeObservations();
        const dataset = validateDataset(request, rawObservations, makeProvenance(request));
        rawObservations[0].temp = 999;

        assert.equal(dataset.observations.length, 5);
        assert.equal(dataset.observations[0].temp, 10);
        assert.equal(dataset.provenance.measurement, DAILY_MAXIMUM_TEMPERATURE_MEASUREMENT);
        assert.deepEqual(dataset.provenance.requestedDateRange, request.dateRange);
        assert.deepEqual(dataset.provenance.returnedDateRange, request.dateRange);
        assert.ok(Object.isFrozen(dataset));
        assert.ok(Object.isFrozen(dataset.observations));
        assert.ok(Object.isFrozen(dataset.observations[0]));
        assert.ok(Object.isFrozen(dataset.provenance));
        assert.ok(Object.isFrozen(dataset.provenance.requestedDateRange));
    });

    it('accepts a request-shaped value but normalizes it before storing', () => {
        const request = makeRequest();
        const requestShape = structuredClone(request);
        const dataset = validateDataset(requestShape, makeObservations(), makeProvenance(requestShape));

        assert.notStrictEqual(dataset.request, requestShape);
        assert.ok(Object.isFrozen(dataset.request));
    });

    it('rejects empty, missing, unordered, duplicate, out-of-range, and non-finite coverage', () => {
        const request = makeRequest();
        assertCategory(() => validateDataset(request, [], makeProvenance(request)), WeatherErrorCategory.INCOMPLETE_COVERAGE);
        assertCategory(() => validateDataset(request, makeObservations().slice(0, 4), makeProvenance(request)), WeatherErrorCategory.INCOMPLETE_COVERAGE);

        const unordered = makeObservations();
        [unordered[0], unordered[1]] = [unordered[1], unordered[0]];
        assertCategory(() => validateDataset(request, unordered, makeProvenance(request)), WeatherErrorCategory.INCOMPLETE_COVERAGE);

        const duplicate = makeObservations();
        duplicate[1] = { date: '2024-01-01', temp: 11 };
        assertCategory(() => validateDataset(request, duplicate, makeProvenance(request)), WeatherErrorCategory.INCOMPLETE_COVERAGE);

        const outside = makeObservations();
        outside[0] = { date: '2023-12-31', temp: 10 };
        assertCategory(() => validateDataset(request, outside, makeProvenance(request)), WeatherErrorCategory.MALFORMED_RESPONSE);

        const nonFinite = makeObservations();
        nonFinite[2] = { date: '2024-01-03', temp: NaN };
        assertCategory(() => validateDataset(request, nonFinite, makeProvenance(request)), WeatherErrorCategory.INCOMPLETE_COVERAGE);
    });

    it('rejects malformed observations and untrustworthy provenance', () => {
        const request = makeRequest();
        const malformed = makeObservations();
        malformed[0] = null;
        assertCategory(() => validateDataset(request, malformed, makeProvenance(request)), WeatherErrorCategory.MALFORMED_RESPONSE);

        assertCategory(
            () => validateDataset(request, makeObservations(), makeProvenance(request, { measurement: 'temperature_2m_max' })),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        assertCategory(
            () => validateDataset(request, makeObservations(), makeProvenance(request, { temperatureUnit: 'fahrenheit' })),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        assertCategory(
            () => validateDataset(request, makeObservations(), makeProvenance(request, { requestedDateRange: { start: '2024-01-02', end: '2024-01-05' } })),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        assertCategory(
            () => validateDataset(request, makeObservations(), makeProvenance(request, { returnedDateRange: { start: '2024-01-02', end: '2024-01-05' } })),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
    });
});

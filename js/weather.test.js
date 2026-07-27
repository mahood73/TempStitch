import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fetchWeather, fetchUrl } from './weather.js';
import {
    DAILY_MAXIMUM_TEMPERATURE_MEASUREMENT,
    WeatherError,
    WeatherErrorCategory,
    createDateRange,
    createWeatherRequest,
    dateRangeFromYear,
    expandDateRange,
} from './weather-dataset.js';

function buildRequest(year = 2024, tempUnit = 'celsius') {
    return createWeatherRequest('London', 51.5, -0.1, dateRangeFromYear(year), tempUnit);
}

function makeOpenMeteoResponse(dates, temperatures, overrides = {}) {
    return {
        daily: { time: dates, temperature_2m_max: temperatures },
        daily_units: { temperature_2m_max: '°C' },
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
        ...overrides,
    };
}

function makeFakeFetch(responseBody, status = 200) {
    return async () => ({
        ok: status >= 200 && status < 300,
        status,
        json: async () => responseBody,
    });
}

function temperaturesFor(range, base = 10) {
    return expandDateRange(range).map((_, index) => base + (index % 20));
}

async function assertCategory(action, category) {
    await assert.rejects(action, (error) => error instanceof WeatherError && error.category === category);
}

describe('fetchUrl', () => {
    it('builds a URL from the normalized Weather Request', () => {
        const url = fetchUrl(buildRequest());
        assert.ok(url.startsWith('https://archive-api.open-meteo.com/v1/archive?'));
        assert.ok(url.includes('latitude=51.5'));
        assert.ok(url.includes('longitude=-0.1'));
        assert.ok(url.includes('start_date=2024-01-01'));
        assert.ok(url.includes('end_date=2024-12-31'));
        assert.ok(url.includes('temperature_unit=celsius'));
        assert.ok(url.includes('daily=temperature_2m_max'));
    });

    it('rejects an invalid request at the public adapter seam', () => {
        assert.throws(
            () => fetchUrl({ location: { displayName: 'X', lat: 91, lon: 0 }, dateRange: { start: '2024-01-01', end: '2024-01-02' }, tempUnit: 'celsius' }),
            (error) => error instanceof WeatherError && error.category === WeatherErrorCategory.INVALID_REQUEST
        );
    });
});

describe('fetchWeather', () => {
    it('returns a complete normalized Dataset for ordinary and leap years', async () => {
        for (const year of [2023, 2024]) {
            const request = buildRequest(year);
            const dates = expandDateRange(request.dateRange);
            const dataset = await fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(dates, temperaturesFor(request.dateRange))));

            assert.equal(dataset.observations.length, year === 2024 ? 366 : 365);
            assert.deepEqual(dataset.request.dateRange, request.dateRange);
            assert.equal(dataset.provenance.source, 'Open-Meteo');
            assert.equal(dataset.provenance.measurement, DAILY_MAXIMUM_TEMPERATURE_MEASUREMENT);
            assert.equal(dataset.provenance.latitude, 51.5074);
            assert.equal(dataset.provenance.longitude, -0.1278);
            assert.equal(dataset.provenance.timezone, 'Europe/London');
            assert.deepEqual(dataset.provenance.returnedDateRange, request.dateRange);
        }
    });

    it('retains the provider-resolved location rather than selected coordinates', async () => {
        const request = buildRequest();
        const dates = expandDateRange(request.dateRange);
        const dataset = await fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(dates, temperaturesFor(request.dateRange), {
            latitude: 51.5074,
            longitude: -0.1278,
        })));

        assert.notEqual(dataset.provenance.latitude, request.location.lat);
        assert.notEqual(dataset.provenance.longitude, request.location.lon);
    });

    it('uses the requested temperature unit in the Dataset provenance', async () => {
        const request = buildRequest(2024, 'fahrenheit');
        const dates = expandDateRange(request.dateRange);
        const dataset = await fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(dates, temperaturesFor(request.dateRange, 50), { daily_units: { temperature_2m_max: '°F' } })));

        assert.equal(dataset.provenance.temperatureUnit, 'fahrenheit');
    });

    it('distinguishes safe provider rejection from provider unavailability', async () => {
        const request = buildRequest();
        await assert.rejects(
            () => fetchWeather(request, makeFakeFetch({ reason: 'Invalid parameters' }, 400)),
            (error) => error.category === WeatherErrorCategory.PROVIDER_REJECTION
                && error.message === 'Weather service rejected this request. Please check the selected settings.'
                && error.cause.message === 'Weather provider returned HTTP 400'
        );

        await assert.rejects(
            () => fetchWeather(request, makeFakeFetch({ reason: 'Invalid date range' }, 422)),
            (error) => error.category === WeatherErrorCategory.PROVIDER_REJECTION
                && error.message === 'Weather service rejected this request. Please check the selected settings.'
                && error.cause.message === 'Weather provider returned HTTP 422'
        );

        for (const status of [404, 408, 429, 503]) {
            await assert.rejects(
                () => fetchWeather(request, makeFakeFetch({ reason: 'Internal service secret' }, status)),
                (error) => error.category === WeatherErrorCategory.PROVIDER_UNAVAILABLE
                    && error.message === 'Weather service is temporarily unavailable. Please try again'
                    && error.cause.message === `Weather provider returned HTTP ${status}`
            );
        }

        await assert.rejects(
            () => fetchWeather(request, async () => { throw new TypeError('Network request failed'); }),
            (error) => error.category === WeatherErrorCategory.PROVIDER_UNAVAILABLE
                && error.message === 'Weather service is temporarily unavailable. Please try again'
                && error.cause instanceof TypeError
        );
    });

    it('rejects non-JSON and structurally malformed responses', async () => {
        const request = buildRequest();
        await assertCategory(
            () => fetchWeather(request, async () => ({ ok: true, json: async () => { throw new SyntaxError('bad JSON'); } })),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        await assertCategory(
            () => fetchWeather(request, makeFakeFetch({ daily: {} })),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        await assertCategory(
            () => fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse('not an array', []))),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        await assertCategory(
            () => fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(['2024-01-01'], [10, 11]))),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        await assertCategory(
            () => fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(['2024-01-01', '2024-01-02'], [10]))),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
    });

    it('rejects missing provider provenance instead of substituting request values', async () => {
        const request = createWeatherRequest('London', 51.5, -0.1, createDateRange('2024-01-01', '2024-01-02'), 'celsius');
        const dates = expandDateRange(request.dateRange);
        const temperatures = temperaturesFor(request.dateRange);

        await assertCategory(
            () => fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(dates, temperatures, { timezone: undefined }))),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        await assertCategory(
            () => fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(dates, temperatures, { latitude: undefined }))),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        await assertCategory(
            () => fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(dates, temperatures, { longitude: undefined }))),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        await assertCategory(
            () => fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(dates, temperatures, { daily_units: undefined }))),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
        await assertCategory(
            () => fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(dates, temperatures, { daily_units: { temperature_2m_max: '°F' } }))),
            WeatherErrorCategory.MALFORMED_RESPONSE
        );
    });

    it('rejects incomplete and non-finite daily coverage without silently dropping data', async () => {
        const request = createWeatherRequest('London', 51.5, -0.1, createDateRange('2024-01-01', '2024-01-03'), 'celsius');
        await assertCategory(
            () => fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(['2024-01-01', '2024-01-02'], [10, 11]))),
            WeatherErrorCategory.INCOMPLETE_COVERAGE
        );
        await assertCategory(
            () => fetchWeather(request, makeFakeFetch(makeOpenMeteoResponse(['2024-01-01', '2024-01-02', '2024-01-03'], [10, null, 12]))),
            WeatherErrorCategory.INCOMPLETE_COVERAGE
        );
    });
});

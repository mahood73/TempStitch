import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { fetchWeather, fetchUrl } from './weather.js';
import { WeatherError, WeatherErrorCategory, createDateRange, createWeatherRequest, dateRangeFromYear } from './weather-dataset.js';

function makeOpenMeteoResponse(dates, temps, overrides = {}) {
    return {
        daily: { time: dates, temperature_2m_max: temps },
        latitude: overrides.latitude ?? 51.5,
        longitude: overrides.longitude ?? -0.1,
        timezone: overrides.timezone ?? 'Europe/London',
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

function failingFetch() {
    throw new TypeError('Network request failed');
}

function buildRequest(year = 2024) {
    const dateRange = dateRangeFromYear(year);
    return createWeatherRequest('London', 51.5, -0.1, dateRange, 'celsius');
}

function generateFakeObservations(dateRange, baseTemp = 10) {
    const dates = [];
    const temps = [];
    const current = new Date(dateRange.start + 'T00:00:00');
    const end = new Date(dateRange.end + 'T00:00:00');
    let i = 0;
    while (current <= end) {
        const y = current.getFullYear();
        const m = String(current.getMonth() + 1).padStart(2, '0');
        const d = String(current.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        temps.push(baseTemp + (i % 20));
        current.setDate(current.getDate() + 1);
        i++;
    }
    return { dates, temps };
}

describe('fetchUrl', () => {
    it('builds correct URL from request', () => {
        const request = buildRequest(2024);
        const url = fetchUrl(request);
        assert.ok(url.startsWith('https://archive-api.open-meteo.com/v1/archive?'));
        assert.ok(url.includes('latitude=51.5'));
        assert.ok(url.includes('longitude=-0.1'));
        assert.ok(url.includes('start_date=2024-01-01'));
        assert.ok(url.includes('end_date=2024-12-31'));
        assert.ok(url.includes('temperature_unit=celsius'));
        assert.ok(url.includes('daily=temperature_2m_max'));
    });
});

describe('fetchWeather', () => {
    it('returns a valid Weather Dataset for a non-leap year', async () => {
        const request = buildRequest(2023);
        const { dates, temps } = generateFakeObservations(request.dateRange);
        const fakeFetch = makeFakeFetch(makeOpenMeteoResponse(dates, temps));
        const dataset = await fetchWeather(request, fakeFetch);

        assert.equal(dataset.observations.length, 365);
        assert.equal(dataset.request.location.displayName, 'London');
        assert.equal(dataset.request.tempUnit, 'celsius');
        assert.equal(dataset.provenance.source, 'Open-Meteo');
        assert.equal(dataset.provenance.measurement, 'temperature_2m_max');
    });

    it('returns 366 observations for a leap year', async () => {
        const request = buildRequest(2024);
        const { dates, temps } = generateFakeObservations(request.dateRange);
        const fakeFetch = makeFakeFetch(makeOpenMeteoResponse(dates, temps));
        const dataset = await fetchWeather(request, fakeFetch);

        assert.equal(dataset.observations.length, 366);
    });

    it('retains provider-resolved coordinates', async () => {
        const request = buildRequest(2024);
        const { dates, temps } = generateFakeObservations(request.dateRange);
        const fakeFetch = makeFakeFetch(makeOpenMeteoResponse(dates, temps, {
            latitude: 51.5074,
            longitude: -0.1278,
        }));
        const dataset = await fetchWeather(request, fakeFetch);

        assert.equal(dataset.provenance.latitude, 51.5074);
        assert.equal(dataset.provenance.longitude, -0.1278);
    });

    it('retains timezone from provider', async () => {
        const request = buildRequest(2024);
        const { dates, temps } = generateFakeObservations(request.dateRange);
        const fakeFetch = makeFakeFetch(makeOpenMeteoResponse(dates, temps, {
            timezone: 'Europe/London',
        }));
        const dataset = await fetchWeather(request, fakeFetch);

        assert.equal(dataset.provenance.timezone, 'Europe/London');
    });

    it('records requested and returned date ranges', async () => {
        const request = buildRequest(2024);
        const { dates, temps } = generateFakeObservations(request.dateRange);
        const fakeFetch = makeFakeFetch(makeOpenMeteoResponse(dates, temps));
        const dataset = await fetchWeather(request, fakeFetch);

        assert.deepEqual(dataset.provenance.requestedDateRange, request.dateRange);
        assert.equal(dataset.provenance.returnedDateRange.start, '2024-01-01');
        assert.equal(dataset.provenance.returnedDateRange.end, '2024-12-31');
    });

    it('throws provider-failure on HTTP error', async () => {
        const request = buildRequest(2024);
        const fakeFetch = makeFakeFetch({ reason: 'Daily limit exceeded' }, 429);

        try {
            await fetchWeather(request, fakeFetch);
            assert.fail('Should have thrown');
        } catch (err) {
            assert.ok(err instanceof WeatherError);
            assert.equal(err.category, WeatherErrorCategory.PROVIDER_FAILURE);
            assert.ok(err.message.includes('Daily limit exceeded'));
        }
    });

    it('throws provider-failure on network error', async () => {
        const request = buildRequest(2024);

        try {
            await fetchWeather(request, failingFetch);
            assert.fail('Should have thrown');
        } catch (err) {
            assert.ok(err instanceof WeatherError);
            assert.equal(err.category, WeatherErrorCategory.PROVIDER_FAILURE);
        }
    });

    it('throws malformed-response on non-JSON body', async () => {
        const request = buildRequest(2024);
        const fakeFetch = async () => ({
            ok: true,
            status: 200,
            json: async () => { throw new SyntaxError('Unexpected token'); },
        });

        try {
            await fetchWeather(request, fakeFetch);
            assert.fail('Should have thrown');
        } catch (err) {
            assert.ok(err instanceof WeatherError);
            assert.equal(err.category, WeatherErrorCategory.MALFORMED_RESPONSE);
        }
    });

    it('throws malformed-response on missing daily fields', async () => {
        const request = buildRequest(2024);
        const fakeFetch = makeFakeFetch({ daily: {} });

        try {
            await fetchWeather(request, fakeFetch);
            assert.fail('Should have thrown');
        } catch (err) {
            assert.ok(err instanceof WeatherError);
            assert.equal(err.category, WeatherErrorCategory.MALFORMED_RESPONSE);
        }
    });

    it('throws incomplete-coverage when count mismatches', async () => {
        const request = buildRequest(2024);
        const dates = ['2024-01-01', '2024-01-02'];
        const temps = [10, 11];
        const fakeFetch = makeFakeFetch(makeOpenMeteoResponse(dates, temps));

        try {
            await fetchWeather(request, fakeFetch);
            assert.fail('Should have thrown');
        } catch (err) {
            assert.ok(err instanceof WeatherError);
            assert.equal(err.category, WeatherErrorCategory.INCOMPLETE_COVERAGE);
        }
    });

    it('throws incomplete-coverage when observations have null temps', async () => {
        const request = buildRequest(2024);
        const { dates } = generateFakeObservations(request.dateRange);
        const temps = dates.map((_, i) => i === 100 ? null : 10 + (i % 20));
        const fakeFetch = makeFakeFetch(makeOpenMeteoResponse(dates, temps));

        try {
            await fetchWeather(request, fakeFetch);
            assert.fail('Should have thrown');
        } catch (err) {
            assert.ok(err instanceof WeatherError);
            assert.equal(err.category, WeatherErrorCategory.INCOMPLETE_COVERAGE);
        }
    });

    it('uses fahrenheit when requested', async () => {
        const dateRange = dateRangeFromYear(2024);
        const request = createWeatherRequest('Paris', 48.8566, 2.3522, dateRange, 'fahrenheit');
        const { dates, temps } = generateFakeObservations(request.dateRange, 50);
        const fakeFetch = makeFakeFetch(makeOpenMeteoResponse(dates, temps));
        const dataset = await fetchWeather(request, fakeFetch);

        assert.equal(dataset.request.tempUnit, 'fahrenheit');
        assert.equal(dataset.provenance.temperatureUnit, 'fahrenheit');
    });
});

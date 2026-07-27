import {
    DAILY_MAXIMUM_TEMPERATURE_MEASUREMENT,
    WeatherError,
    WeatherErrorCategory,
    normalizeWeatherRequest,
    validateDataset,
} from './weather-dataset.js';

const API_BASE = 'https://archive-api.open-meteo.com/v1/archive';

function isFiniteCoordinate(latitude, longitude) {
    return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
        && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function parseOpenMeteoPayload(data, request) {
    const times = data?.daily?.time;
    const temperatures = data?.daily?.temperature_2m_max;
    const providerUnit = data?.daily_units?.temperature_2m_max;
    const expectedProviderUnit = request.tempUnit === 'celsius' ? '°C' : '°F';
    if (!Array.isArray(times) || !Array.isArray(temperatures) || times.length !== temperatures.length) {
        throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE);
    }
    if (providerUnit !== expectedProviderUnit
        || typeof data.timezone !== 'string' || data.timezone.trim() === ''
        || !isFiniteCoordinate(data.latitude, data.longitude)) {
        throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE);
    }

    const rawObservations = times.map((date, index) => ({ date, temp: temperatures[index] }));
    const provenance = {
        source: 'Open-Meteo',
        measurement: DAILY_MAXIMUM_TEMPERATURE_MEASUREMENT,
        temperatureUnit: request.tempUnit,
        timezone: data.timezone,
        latitude: data.latitude,
        longitude: data.longitude,
        requestedDateRange: request.dateRange,
        returnedDateRange: {
            start: times[0],
            end: times[times.length - 1],
        },
    };

    return { rawObservations, provenance };
}

function buildFetchUrl(request) {
    const params = new URLSearchParams({
        latitude: request.location.lat,
        longitude: request.location.lon,
        start_date: request.dateRange.start,
        end_date: request.dateRange.end,
        daily: 'temperature_2m_max',
        temperature_unit: request.tempUnit,
        timezone: 'auto',
    });
    return `${API_BASE}?${params}`;
}

export function fetchUrl(request) {
    return buildFetchUrl(normalizeWeatherRequest(request));
}

export async function fetchWeather(request, fetchFn = fetch, signal) {
    const normalizedRequest = normalizeWeatherRequest(request);
    const url = buildFetchUrl(normalizedRequest);

    let response;
    try {
        response = await fetchFn(url, { signal });
    } catch (error) {
        throw new WeatherError(WeatherErrorCategory.PROVIDER_UNAVAILABLE, error);
    }

    if (!response || typeof response.ok !== 'boolean') {
        throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE);
    }
    if (!response.ok) {
        const category = response.status === 400 || response.status === 422
            ? WeatherErrorCategory.PROVIDER_REJECTION
            : WeatherErrorCategory.PROVIDER_UNAVAILABLE;
        throw new WeatherError(category, new Error(`Weather provider returned HTTP ${response.status}`));
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE, error);
    }

    const { rawObservations, provenance } = parseOpenMeteoPayload(data, normalizedRequest);
    return validateDataset(normalizedRequest, rawObservations, provenance);
}

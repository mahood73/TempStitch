import { WeatherError, WeatherErrorCategory, validateDataset, expandDateRange } from './weather-dataset.js';

const API_BASE = 'https://archive-api.open-meteo.com/v1/archive';

export function fetchUrl(request) {
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

export async function fetchWeather(request, fetchFn = fetch) {
    const url = fetchUrl(request);

    let res;
    try {
        res = await fetchFn(url);
    } catch {
        throw new WeatherError(WeatherErrorCategory.PROVIDER_FAILURE, 'Weather service is unavailable');
    }

    if (!res.ok) {
        let reason;
        try {
            const body = await res.json();
            reason = body?.reason;
        } catch {
            // response body not JSON
        }
        throw new WeatherError(WeatherErrorCategory.PROVIDER_FAILURE, reason || `Weather API error (${res.status})`);
    }

    let data;
    try {
        data = await res.json();
    } catch {
        throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE, 'Response is not valid JSON');
    }

    if (!data?.daily?.time || !data?.daily?.temperature_2m_max) {
        throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE, 'Response missing expected fields');
    }

    const times = data.daily.time;
    const temps = data.daily.temperature_2m_max;
    const rawObservations = [];
    for (let i = 0; i < times.length; i++) {
        rawObservations.push({ date: times[i], temp: temps[i] });
    }

    const provenance = {
        source: 'Open-Meteo',
        measurement: 'temperature_2m_max',
        temperatureUnit: request.tempUnit,
        timezone: data.timezone || 'UTC',
        latitude: data.latitude ?? request.location.lat,
        longitude: data.longitude ?? request.location.lon,
        requestedDateRange: request.dateRange,
        returnedDateRange: {
            start: times[0] ?? request.dateRange.start,
            end: times[times.length - 1] ?? request.dateRange.end,
        },
    };

    return validateDataset(request, rawObservations, provenance);
}

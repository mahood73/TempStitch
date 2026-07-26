const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const WeatherErrorCategory = Object.freeze({
    INVALID_REQUEST: 'invalid-request',
    PROVIDER_FAILURE: 'provider-failure',
    MALFORMED_RESPONSE: 'malformed-response',
    INCOMPLETE_COVERAGE: 'incomplete-coverage',
});

export class WeatherError extends Error {
    constructor(category, message) {
        super(message);
        this.name = 'WeatherError';
        this.category = category;
    }
}

function isValidDateString(s) {
    if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function createDateRange(start, end) {
    if (!isValidDateString(start)) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST, `Invalid start date: ${start}`);
    }
    if (!isValidDateString(end)) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST, `Invalid end date: ${end}`);
    }
    if (start > end) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST, `Start date ${start} is after end date ${end}`);
    }
    return { start, end };
}

export function dateRangeFromYear(year) {
    if (!Number.isInteger(year) || year < 1) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST, `Invalid year: ${year}`);
    }
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const endDay = isLeap ? 366 : 365;
    const end = new Date(Date.UTC(year, 0, endDay));
    return createDateRange(`${year}-01-01`, `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`);
}

export function dateRangeLastDays(days) {
    if (!Number.isInteger(days) || days < 1) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST, `Invalid day count: ${days}`);
    }
    const end = new Date(Date.now());
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);
    return createDateRange(
        `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`,
        `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`
    );
}

export function countDaysInRange(dateRange) {
    const [sy, sm, sd] = dateRange.start.split('-').map(Number);
    const [ey, em, ed] = dateRange.end.split('-').map(Number);
    const startMs = Date.UTC(sy, sm - 1, sd);
    const endMs = Date.UTC(ey, em - 1, ed);
    return Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
}

export function expandDateRange(dateRange) {
    const days = countDaysInRange(dateRange);
    const [sy, sm, sd] = dateRange.start.split('-').map(Number);
    const dates = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(Date.UTC(sy, sm - 1, sd + i));
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${day}`);
    }
    return dates;
}

export function createWeatherRequest(displayName, lat, lon, dateRange, tempUnit) {
    if (typeof displayName !== 'string' || displayName.trim() === '') {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST, 'Location display name is required');
    }
    if (typeof lat !== 'number' || lat < -90 || lat > 90 || !Number.isFinite(lat)) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST, `Invalid latitude: ${lat}`);
    }
    if (typeof lon !== 'number' || lon < -180 || lon > 180 || !Number.isFinite(lon)) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST, `Invalid longitude: ${lon}`);
    }
    if (tempUnit !== 'celsius' && tempUnit !== 'fahrenheit') {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST, `Invalid temperature unit: ${tempUnit}`);
    }
    return {
        location: { displayName: displayName.trim(), lat, lon },
        dateRange,
        tempUnit,
    };
}

export function validateDataset(request, rawObservations, provenance) {
    if (!Array.isArray(rawObservations) || rawObservations.length === 0) {
        throw new WeatherError(WeatherErrorCategory.INCOMPLETE_COVERAGE, 'No observations returned');
    }

    const expectedDates = expandDateRange(request.dateRange);
    const expectedCount = expectedDates.length;

    if (rawObservations.length !== expectedCount) {
        throw new WeatherError(
            WeatherErrorCategory.INCOMPLETE_COVERAGE,
            `Expected ${expectedCount} observations for ${request.dateRange.start} to ${request.dateRange.end}, received ${rawObservations.length}`
        );
    }

    const seen = new Set();
    for (let i = 0; i < rawObservations.length; i++) {
        const obs = rawObservations[i];
        if (!obs || typeof obs !== 'object') {
            throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE, `Observation at index ${i} is not an object`);
        }
        if (typeof obs.date !== 'string' || !isValidDateString(obs.date)) {
            throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE, `Observation at index ${i} has invalid date: ${obs.date}`);
        }
        if (typeof obs.temp !== 'number' || !Number.isFinite(obs.temp)) {
            throw new WeatherError(WeatherErrorCategory.INCOMPLETE_COVERAGE, `Observation at index ${i} has non-finite temperature`);
        }
        if (obs.date < request.dateRange.start || obs.date > request.dateRange.end) {
            throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE, `Observation at index ${i} has date ${obs.date} outside requested range`);
        }
        if (obs.date !== expectedDates[i]) {
            throw new WeatherError(
                WeatherErrorCategory.INCOMPLETE_COVERAGE,
                `Observation at index ${i} expected date ${expectedDates[i]}, got ${obs.date}`
            );
        }
        if (seen.has(obs.date)) {
            throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE, `Duplicate observation for date ${obs.date}`);
        }
        seen.add(obs.date);
    }

    return {
        request,
        observations: rawObservations,
        provenance: {
            source: provenance.source,
            measurement: provenance.measurement,
            temperatureUnit: provenance.temperatureUnit,
            timezone: provenance.timezone,
            latitude: provenance.latitude,
            longitude: provenance.longitude,
            requestedDateRange: provenance.requestedDateRange,
            returnedDateRange: provenance.returnedDateRange,
        },
    };
}

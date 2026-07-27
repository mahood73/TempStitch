const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const WeatherErrorCategory = Object.freeze({
    INVALID_REQUEST: 'invalid-request',
    PROVIDER_REJECTION: 'provider-rejection',
    PROVIDER_UNAVAILABLE: 'provider-unavailable',
    MALFORMED_RESPONSE: 'malformed-response',
    INCOMPLETE_COVERAGE: 'incomplete-coverage',
});

const WEATHER_ERROR_MESSAGES = Object.freeze({
    [WeatherErrorCategory.INVALID_REQUEST]: 'Please check your location and date settings',
    [WeatherErrorCategory.PROVIDER_REJECTION]: 'Weather service rejected this request. Please check the selected settings.',
    [WeatherErrorCategory.PROVIDER_UNAVAILABLE]: 'Weather service is temporarily unavailable. Please try again',
    [WeatherErrorCategory.MALFORMED_RESPONSE]: 'Received unexpected data from weather service',
    [WeatherErrorCategory.INCOMPLETE_COVERAGE]: 'Weather data is not available for the full requested period',
});

const UNKNOWN_WEATHER_ERROR_MESSAGE = 'Unable to load weather data. Please try again';
export const DAILY_MAXIMUM_TEMPERATURE_MEASUREMENT = 'Daily maximum temperature at 2 m';

export class WeatherError extends Error {
    constructor(category, cause) {
        super(WEATHER_ERROR_MESSAGES[category] || UNKNOWN_WEATHER_ERROR_MESSAGE, cause === undefined ? undefined : { cause });
        this.name = 'WeatherError';
        this.category = category;
    }
}

function freeze(value) {
    return Object.freeze(value);
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidDateString(value) {
    if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function hasFiniteCoordinate(latitude, longitude) {
    return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
        && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function sameDateRange(left, right) {
    return left.start === right.start && left.end === right.end;
}

export function createDateRange(start, end) {
    if (!isValidDateString(start) || !isValidDateString(end) || start > end) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST);
    }
    return freeze({ start, end });
}

export function dateRangeFromYear(year) {
    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST);
    }
    return createDateRange(`${year}-01-01`, `${year}-12-31`);
}

export function dateRangeLastDays(days) {
    if (!Number.isInteger(days) || days < 1) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST);
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
    const range = createDateRange(dateRange?.start, dateRange?.end);
    const [startYear, startMonth, startDay] = range.start.split('-').map(Number);
    const [endYear, endMonth, endDay] = range.end.split('-').map(Number);
    const startMs = Date.UTC(startYear, startMonth - 1, startDay);
    const endMs = Date.UTC(endYear, endMonth - 1, endDay);
    return Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
}

export function expandDateRange(dateRange) {
    const range = createDateRange(dateRange?.start, dateRange?.end);
    const days = countDaysInRange(range);
    const [year, month, day] = range.start.split('-').map(Number);
    const dates = [];
    for (let index = 0; index < days; index++) {
        const date = new Date(Date.UTC(year, month - 1, day + index));
        dates.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`);
    }
    return dates;
}

export function createWeatherRequest(displayName, lat, lon, dateRange, tempUnit) {
    if (typeof displayName !== 'string' || displayName.trim() === ''
        || !hasFiniteCoordinate(lat, lon)
        || (tempUnit !== 'celsius' && tempUnit !== 'fahrenheit')) {
        throw new WeatherError(WeatherErrorCategory.INVALID_REQUEST);
    }

    const normalizedDateRange = createDateRange(dateRange?.start, dateRange?.end);
    return freeze({
        location: freeze({ displayName: displayName.trim(), lat, lon }),
        dateRange: normalizedDateRange,
        tempUnit,
    });
}

export function normalizeWeatherRequest(request) {
    return createWeatherRequest(
        request?.location?.displayName,
        request?.location?.lat,
        request?.location?.lon,
        request?.dateRange,
        request?.tempUnit
    );
}

function normalizeProvenance(request, provenance, observations) {
    if (!isPlainObject(provenance)
        || typeof provenance.source !== 'string' || provenance.source.trim() === ''
        || provenance.measurement !== DAILY_MAXIMUM_TEMPERATURE_MEASUREMENT
        || provenance.temperatureUnit !== request.tempUnit
        || typeof provenance.timezone !== 'string' || provenance.timezone.trim() === ''
        || !hasFiniteCoordinate(provenance.latitude, provenance.longitude)) {
        throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE);
    }

    let requestedDateRange;
    let returnedDateRange;
    try {
        requestedDateRange = createDateRange(provenance.requestedDateRange?.start, provenance.requestedDateRange?.end);
        returnedDateRange = createDateRange(provenance.returnedDateRange?.start, provenance.returnedDateRange?.end);
    } catch (error) {
        throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE, error);
    }

    if (!sameDateRange(requestedDateRange, request.dateRange)
        || returnedDateRange.start !== observations[0].date
        || returnedDateRange.end !== observations[observations.length - 1].date) {
        throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE);
    }

    return freeze({
        source: provenance.source.trim(),
        measurement: DAILY_MAXIMUM_TEMPERATURE_MEASUREMENT,
        temperatureUnit: request.tempUnit,
        timezone: provenance.timezone.trim(),
        latitude: provenance.latitude,
        longitude: provenance.longitude,
        requestedDateRange,
        returnedDateRange,
    });
}

export function validateDataset(request, rawObservations, provenance) {
    const normalizedRequest = normalizeWeatherRequest(request);
    if (!Array.isArray(rawObservations) || rawObservations.length === 0) {
        throw new WeatherError(WeatherErrorCategory.INCOMPLETE_COVERAGE);
    }

    const expectedDates = expandDateRange(normalizedRequest.dateRange);
    if (rawObservations.length !== expectedDates.length) {
        throw new WeatherError(WeatherErrorCategory.INCOMPLETE_COVERAGE);
    }

    const observations = rawObservations.map((observation, index) => {
        if (!isPlainObject(observation) || !isValidDateString(observation.date)) {
            throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE);
        }
        if (typeof observation.temp !== 'number' || !Number.isFinite(observation.temp)) {
            throw new WeatherError(WeatherErrorCategory.INCOMPLETE_COVERAGE);
        }
        if (observation.date < normalizedRequest.dateRange.start || observation.date > normalizedRequest.dateRange.end) {
            throw new WeatherError(WeatherErrorCategory.MALFORMED_RESPONSE);
        }
        if (observation.date !== expectedDates[index]) {
            throw new WeatherError(WeatherErrorCategory.INCOMPLETE_COVERAGE);
        }
        return freeze({ date: observation.date, temp: observation.temp });
    });

    const normalizedProvenance = normalizeProvenance(normalizedRequest, provenance, observations);
    return freeze({
        request: normalizedRequest,
        observations: freeze(observations),
        provenance: normalizedProvenance,
    });
}

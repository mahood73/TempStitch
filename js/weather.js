const Weather = (() => {
    const API_BASE = 'https://archive-api.open-meteo.com/v1/archive';

    function dateToString(d) {
        return d.toISOString().split('T')[0];
    }

    function getDateRange() {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 364);
        return { start: dateToString(start), end: dateToString(end) };
    }

    async function fetchDailyMax(lat, lon, tempUnit = 'celsius') {
        const { start, end } = getDateRange();
        const params = new URLSearchParams({
            latitude: lat,
            longitude: lon,
            start_date: start,
            end_date: end,
            daily: 'temperature_2m_max',
            temperature_unit: tempUnit,
            timezone: 'auto',
        });

        const res = await fetch(`${API_BASE}?${params}`);
        if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(body?.reason || `Weather API error (${res.status})`);
        }

        const data = await res.json();
        const times = data.daily.time;
        const temps = data.daily.temperature_2m_max;

        const days = [];
        for (let i = 0; i < times.length; i++) {
            if (temps[i] !== null && temps[i] !== undefined) {
                days.push({ date: times[i], temp: temps[i] });
            }
        }

        return {
            days,
            meta: {
                latitude: data.latitude,
                longitude: data.longitude,
                elevation: data.elevation,
                timezone: data.timezone,
                generationMs: data.generationtime_ms,
            },
        };
    }

    return { fetchDailyMax, getDateRange };
})();

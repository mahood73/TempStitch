const Location = (() => {
    const STORAGE_KEY = 'weather-blanket-location';

    function getSaved() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function save(lat, lon) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lon }));
    }

    function validate(lat, lon) {
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        if (isNaN(latNum) || isNaN(lonNum)) return null;
        if (latNum < -90 || latNum > 90) return null;
        if (lonNum < -180 || lonNum > 180) return null;
        return { lat: latNum, lon: lonNum };
    }

    function requestBrowserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                (err) => {
                    if (err.code === 1) reject(new Error('Location access denied'));
                    else if (err.code === 2) reject(new Error('Location unavailable'));
                    else if (err.code === 3) reject(new Error('Location request timed out'));
                    else reject(new Error('Could not get location'));
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
            );
        });
    }

    async function search(query) {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Geocoding request failed');
        const data = await res.json();
        return data.results || [];
    }

    return { getSaved, save, validate, requestBrowserLocation, search };
})();

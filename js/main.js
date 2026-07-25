(() => {
    const $ = (id) => document.getElementById(id);

    const els = {
        lat: $('latitude'),
        lon: $('longitude'),
        geoBtn: $('geo-location-btn'),
        fetchBtn: $('fetch-weather-btn'),
        status: $('location-status'),
        tempUnit: $('temp-unit'),
        stitchCount: $('stitch-count'),
        numColours: $('num-colours'),
        colourKeyMin: $('colour-key-min'),
        colourKeyMax: $('colour-key-max'),
        palette: $('colour-palette'),
        patternSection: $('pattern-section'),
        patternPreview: $('pattern-preview'),
        patternStats: $('pattern-stats'),
        colourKey: $('colour-key'),
        patternInstructions: $('pattern-instructions'),
        loading: $('loading'),
        error: $('error'),
        downloadBtn: $('download-image-btn'),
    };

    let currentPattern = null;
    let hasGenerated = false;

    function showError(msg) {
        els.error.textContent = msg;
        els.error.style.display = 'block';
    }

    function hideError() {
        els.error.style.display = 'none';
    }

    function showLoading(msg) {
        els.loading.querySelector('p').textContent = msg || 'Loading...';
        els.loading.style.display = 'block';
    }

    function hideLoading() {
        els.loading.style.display = 'none';
    }

    function setStatus(msg, type) {
        els.status.textContent = msg;
        els.status.className = 'status ' + (type || '');
    }

    function getLocation() {
        const loc = Location.validate(els.lat.value, els.lon.value);
        if (!loc) {
            showError('Please enter valid latitude (-90 to 90) and longitude (-180 to 180)');
            return null;
        }
        Location.save(loc.lat, loc.lon);
        return loc;
    }

    async function generatePattern() {
        hideError();
        const loc = getLocation();
        if (!loc) return;

        showLoading('Fetching weather data...');
        els.fetchBtn.disabled = true;

        try {
            const unit = els.tempUnit.value;
            const result = await Weather.fetchDailyMax(loc.lat, loc.lon, unit);

            if (result.days.length === 0) {
                showError('No weather data available for this location and date range');
                hideLoading();
                return;
            }

            const options = {
                stitchCount: parseInt(els.stitchCount.value) || 50,
                paletteName: els.palette.value,
                numColours: parseInt(els.numColours.value) || 10,
                colourKeyMin: els.colourKeyMin.value ? parseFloat(els.colourKeyMin.value) : null,
                colourKeyMax: els.colourKeyMax.value ? parseFloat(els.colourKeyMax.value) : null,
            };

            currentPattern = Pattern.generate(result, options);

            hideLoading();

            const unitSymbol = unit === 'fahrenheit' ? '°F' : '°C';
            Pattern.renderStats(currentPattern.stats, els.patternStats, unitSymbol);
            Pattern.renderGrid(currentPattern, els.patternPreview);
            Pattern.renderColourKey(currentPattern.colourKey, els.colourKey);
            Pattern.renderInstructions(currentPattern, els.patternInstructions);

            els.patternSection.style.display = 'block';
            els.patternSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

            if (!hasGenerated) {
                hasGenerated = true;
                els.fetchBtn.textContent = 'Update Design';
            }

            setStatus(`Design generated: ${result.meta.latitude.toFixed(2)}, ${result.meta.longitude.toFixed(2)}`, 'success');
        } catch (err) {
            hideLoading();
            showError('Failed to fetch weather data: ' + err.message);
        } finally {
            els.fetchBtn.disabled = false;
        }
    }

    async function handleGeoLocation() {
        hideError();
        setStatus('Getting your location...', '');

        try {
            const loc = await Location.requestBrowserLocation();
            els.lat.value = loc.lat.toFixed(4);
            els.lon.value = loc.lon.toFixed(4);
            Location.save(loc.lat, loc.lon);
            setStatus('Location set', 'success');
        } catch (err) {
            setStatus(err.message, 'error');
        }
    }

    function init() {
        const saved = Location.getSaved();
        if (saved) {
            els.lat.value = saved.lat;
            els.lon.value = saved.lon;
        }

        els.geoBtn.addEventListener('click', handleGeoLocation);
        els.fetchBtn.addEventListener('click', generatePattern);
        els.downloadBtn.addEventListener('click', () => {
            if (currentPattern) Export.downloadImage(currentPattern);
        });
    }

    init();
})();

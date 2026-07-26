(() => {
    const $ = (id) => document.getElementById(id);

    const els = {
        lat: $('latitude'),
        lon: $('longitude'),
        geoBtn: $('geo-location-btn'),
        searchInput: $('location-search'),
        searchResults: $('search-results'),
        fetchBtn: $('fetch-weather-btn'),
        status: $('location-status'),
        tempUnit: $('temp-unit'),
        stitchCount: $('stitch-count'),
        yearSelect: $('year-select'),
        numColours: $('num-colours'),
        colourKeyMin: $('colour-key-min'),
        colourKeyMax: $('colour-key-max'),
        palette: $('colour-palette'),
        settingsSection: $('settings-section'),
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
    let searchTimeout = null;

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

    function hideSearchResults() {
        els.searchResults.style.display = 'none';
        els.searchResults.innerHTML = '';
    }

    function showSearchResults(results) {
        if (results.length === 0) {
            els.searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
            els.searchResults.style.display = 'block';
            return;
        }

        els.searchResults.innerHTML = results.map((r, i) => {
            const parts = [r.name];
            if (r.admin1) parts.push(r.admin1);
            if (r.country) parts.push(r.country);
            const meta = parts.join(', ');
            const coords = `${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)}`;
            return `<div class="search-result-item" data-index="${i}">
                <div class="search-result-name">${r.name}</div>
                <div class="search-result-meta">${meta} &middot; ${coords}</div>
            </div>`;
        }).join('');

        els.searchResults.querySelectorAll('.search-result-item').forEach((item) => {
            item.addEventListener('click', () => {
                const r = results[parseInt(item.dataset.index)];
                els.lat.value = r.latitude.toFixed(4);
                els.lon.value = r.longitude.toFixed(4);
                const parts = [r.name];
                if (r.admin1) parts.push(r.admin1);
                if (r.country) parts.push(r.country);
                els.searchInput.value = parts.join(', ');
                hideSearchResults();
                Location.save(r.latitude, r.longitude);
                setStatus(`Location set: ${r.name}`, 'success');
            });
        });

        els.searchResults.style.display = 'block';
    }

    async function handleSearch() {
        const query = els.searchInput.value.trim();
        if (query.length < 2) {
            hideSearchResults();
            return;
        }

        try {
            const results = await Location.search(query);
            showSearchResults(results);
        } catch (err) {
            hideSearchResults();
        }
    }

    async function generatePattern() {
        hideError();
        const loc = getLocation();
        if (!loc) return;

        showLoading('Fetching weather data...');
        els.fetchBtn.disabled = true;

        try {
            const unit = els.tempUnit.value;
            const year = els.yearSelect.value ? parseInt(els.yearSelect.value) : null;
            const result = await Weather.fetchDailyMax(loc.lat, loc.lon, unit, year);

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
            Pattern.renderColourKey(currentPattern.colourKey, els.colourKey, currentPattern.rows);
            Pattern.renderInstructions(currentPattern, els.patternInstructions);

            els.patternSection.style.display = 'block';
            document.querySelector('main').classList.add('has-pattern');
            els.patternSection.classList.remove('pattern-animate');
            void els.patternSection.offsetWidth;
            els.patternSection.classList.add('pattern-animate');
            els.patternSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

            if (!hasGenerated) {
                hasGenerated = true;
                els.fetchBtn.textContent = 'Update Blanket';
                els.settingsSection.querySelector('h2').textContent = 'Edit your blanket';
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
            els.searchInput.value = 'Current location';
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

        const prevYear = new Date().getFullYear() - 1;
        els.yearSelect.value = prevYear;
        els.yearSelect.max = prevYear;

        els.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(handleSearch, 300);
        });

        els.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') hideSearchResults();
        });

        document.addEventListener('click', (e) => {
            if (!els.searchResults.contains(e.target) && e.target !== els.searchInput) {
                hideSearchResults();
            }
        });

        els.geoBtn.addEventListener('click', handleGeoLocation);
        els.fetchBtn.addEventListener('click', generatePattern);
        els.downloadBtn.addEventListener('click', () => {
            if (currentPattern) Export.downloadImage(currentPattern);
        });
    }

    init();
})();

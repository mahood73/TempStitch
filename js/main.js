import { getSaved, save, validate, requestBrowserLocation, search } from './location.js';
import { fetchWeather } from './weather.js';
import { dateRangeFromYear, dateRangeLastDays, createWeatherRequest, WeatherError, WeatherErrorCategory } from './weather-dataset.js';
import { generate, renderGrid, renderStats, renderColourKey, renderInstructions } from './pattern.js';
import { downloadImage, downloadInstructions } from './export.js';

const $ = (id) => document.getElementById(id);

const els = {
    lat: $('latitude'),
    lon: $('longitude'),
    geoBtn: $('geo-location-btn'),
    searchInput: $('location-search'),
    searchResults: $('search-results'),
    fetchBtn: $('fetch-weather-btn'),
    status: $('location-status'),
    craftType: $('craft-type'),
    tempUnit: $('temp-unit'),
    stitchCount: $('stitch-count'),
    stitchPreset: $('stitch-preset'),
    yearSelect: $('year-select'),
    numColours: $('num-colours'),
    colourKeyMin: $('colour-key-min'),
    colourKeyMax: $('colour-key-max'),
    palette: $('colour-palette'),
    terminology: $('terminology'),
    settingsSection: $('settings-section'),
    patternSection: $('pattern-section'),
    patternPreview: $('pattern-preview'),
    patternStats: $('pattern-stats'),
    colourKey: $('colour-key'),
    patternInstructions: $('pattern-instructions'),
    loading: $('loading'),
    error: $('error'),
    downloadBtn: $('download-image-btn'),
    downloadInstructionsBtn: $('download-instructions-btn'),
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
    const loc = validate(els.lat.value, els.lon.value);
    if (!loc) {
        showError('Please enter valid latitude (-90 to 90) and longitude (-180 to 180)');
        return null;
    }
    save(loc.lat, loc.lon);
    const displayName = els.searchInput.value.trim() || `${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`;
    return { ...loc, displayName };
}

function weatherErrorMessage(err) {
    if (!(err instanceof WeatherError)) return 'Failed to fetch weather data: ' + err.message;
    switch (err.category) {
        case WeatherErrorCategory.INVALID_REQUEST:
            return 'Please check your location and date settings';
        case WeatherErrorCategory.PROVIDER_FAILURE:
            return 'Weather service is temporarily unavailable. Please try again';
        case WeatherErrorCategory.MALFORMED_RESPONSE:
            return 'Received unexpected data from weather service';
        case WeatherErrorCategory.INCOMPLETE_COVERAGE:
            return 'Weather data is not available for the full requested period';
        default:
            return 'Failed to fetch weather data';
    }
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
            save(r.latitude, r.longitude);
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
        const results = await search(query);
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
        const dateRange = year ? dateRangeFromYear(year) : dateRangeLastDays(365);
        const request = createWeatherRequest(loc.displayName, loc.lat, loc.lon, dateRange, unit);
        const dataset = await fetchWeather(request);

        const options = {
            craftType: els.craftType.value,
            terminology: els.terminology.value,
            stitchCount: parseInt(els.stitchCount.value) || 50,
            paletteName: els.palette.value,
            numColours: parseInt(els.numColours.value) || 10,
            colourKeyMin: els.colourKeyMin.value ? parseFloat(els.colourKeyMin.value) : null,
            colourKeyMax: els.colourKeyMax.value ? parseFloat(els.colourKeyMax.value) : null,
        };

        currentPattern = generate(dataset, options);

        hideLoading();

        renderStats(currentPattern.stats, els.patternStats, currentPattern.options.tempUnit === 'fahrenheit' ? '°F' : '°C');
        renderGrid(currentPattern, els.patternPreview);
        renderColourKey(currentPattern.colourKey, els.colourKey, currentPattern.rows);
        renderInstructions(currentPattern, els.patternInstructions);

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

        setStatus(`Design generated: ${dataset.provenance.latitude.toFixed(2)}, ${dataset.provenance.longitude.toFixed(2)}`, 'success');
    } catch (err) {
        hideLoading();
        showError(weatherErrorMessage(err));
    } finally {
        els.fetchBtn.disabled = false;
    }
}

async function handleGeoLocation() {
    hideError();
    setStatus('Getting your location...', '');

    try {
        const loc = await requestBrowserLocation();
        els.lat.value = loc.lat.toFixed(4);
        els.lon.value = loc.lon.toFixed(4);
        save(loc.lat, loc.lon);
        els.searchInput.value = 'Current location';
        setStatus('Location set', 'success');
    } catch (err) {
        setStatus(err.message, 'error');
    }
}

function init() {
    const saved = getSaved();
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
        if (currentPattern) downloadImage(currentPattern);
    });

    els.downloadInstructionsBtn.addEventListener('click', () => {
        if (currentPattern) downloadInstructions(currentPattern);
    });

    els.stitchPreset.addEventListener('change', () => {
        const val = els.stitchPreset.value;
        if (val) {
            els.stitchCount.value = val;
        }
    });
}

init();

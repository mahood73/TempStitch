import { getSaved, save, validate, requestBrowserLocation } from './location.js';
import { fetchWeather } from './weather.js';
import { dateRangeFromYear, createWeatherRequest, WeatherError } from './weather-dataset.js';
import { generate, renderProject } from './pattern.js';
import { createProjectStore } from './project-state.js';
import { downloadImage, downloadInstructions } from './export.js';
import { PROJECT_TYPES, typeLabel } from './project-types.js';
import { setupSearch } from './search.js';

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
    settingsHeading: $('settings-heading'),
    settingsBody: $('settings-body'),
    patternSection: $('pattern-section'),
    patternPreview: $('pattern-preview'),
    patternStats: $('pattern-stats'),
    colourKey: $('colour-key'),
    patternInstructions: $('pattern-instructions'),
    loading: $('loading'),
    error: $('error'),
    downloadBtn: $('download-image-btn'),
    downloadInstructionsBtn: $('download-instructions-btn'),
    editSettingsBtn: $('edit-settings-btn'),
};

const projectStore = createProjectStore((project) => {
    renderProject(project, {
        stats: els.patternStats,
        grid: els.patternPreview,
        colourKey: els.colourKey,
        instructions: els.patternInstructions,
    });
});

let hasGenerated = false;

function projectType() {
    const selected = els.stitchPreset.selectedOptions[0];
    return selected?.dataset?.projectType || PROJECT_TYPES.blanket;
}

function updateLabels() {
    const type = projectType();
    const cap = typeLabel(type);
    const low = type;

    els.fetchBtn.textContent = hasGenerated ? `Update ${cap}` : `Create ${cap}`;
    els.settingsHeading.textContent = hasGenerated ? `Edit your ${low}` : 'Settings';

    const toggle = els.settingsBody.querySelector('.settings-toggle');
    if (toggle) {
        toggle.textContent = hasGenerated ? 'Change settings' : `Configure your ${low}`;
    }

    const resultHeading = els.patternSection.querySelector('h2');
    if (resultHeading) {
        resultHeading.textContent = `Your ${cap}`;
    }
}

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
        showError('Select a location by searching for a place or using "Use my current location".');
        els.searchInput.focus();
        return null;
    }
    save(loc.lat, loc.lon);
    const displayName = els.searchInput.value.trim() || `${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`;
    return { ...loc, displayName };
}

function weatherErrorMessage(err) {
    return err instanceof WeatherError
        ? err.message
        : 'Unable to load weather data. Please try again';
}

async function generatePattern() {
    hideError();
    const loc = getLocation();
    if (!loc) return;

    showLoading('Fetching weather data...');
    els.fetchBtn.disabled = true;

    try {
        const unit = els.tempUnit.value;
        const year = parseInt(els.yearSelect.value);
        const dateRange = dateRangeFromYear(year);
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

        const project = generate(dataset, options);
        const committedProject = projectStore.commit(project);

        hideLoading();

        els.patternSection.style.display = 'block';
        document.querySelector('main').classList.add('has-pattern');
        els.patternSection.classList.remove('pattern-animate');
        void els.patternSection.offsetWidth;
        els.patternSection.classList.add('pattern-animate');
        els.patternSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (!hasGenerated) {
            hasGenerated = true;
            updateLabels();
            els.settingsBody.removeAttribute('open');
        }

        const location = committedProject.dataset.request.location;
        const source = committedProject.dataset.provenance;
        setStatus(
            `Design generated for ${location.displayName} (weather source: ${source.latitude.toFixed(2)}, ${source.longitude.toFixed(2)})`,
            'success'
        );
    } catch (err) {
        hideLoading();
        if (projectStore.getProject()) {
            showError(weatherErrorMessage(err) + ' The previous design is unchanged.');
        } else {
            showError(weatherErrorMessage(err));
        }
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

    updateLabels();

    setupSearch(els, { save, setStatus });

    els.geoBtn.addEventListener('click', handleGeoLocation);
    els.fetchBtn.addEventListener('click', generatePattern);
    els.downloadBtn.addEventListener('click', () => {
        const project = projectStore.getProject();
        if (project) downloadImage(project);
    });

    els.downloadInstructionsBtn.addEventListener('click', () => {
        const project = projectStore.getProject();
        if (project) downloadInstructions(project);
    });

    els.editSettingsBtn.addEventListener('click', () => {
        els.settingsBody.setAttribute('open', '');
        els.settingsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        els.craftType.focus();
    });

    els.stitchPreset.addEventListener('change', () => {
        const val = els.stitchPreset.value;
        if (val) {
            els.stitchCount.value = val;
        }
        updateLabels();
    });
}

init();

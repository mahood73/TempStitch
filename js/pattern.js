import { calculateSmartDefaults, buildColourKey, getColor } from './color-mapper.js';

const GAUGE = {
    knit:   { stitchesPerInch: 4.5, rowsPerInch: 6 },
    crochet: { stitchesPerInch: 3.5, rowsPerInch: 4 },
};

function deepFreeze(value, seen = new Set()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    Object.values(value).forEach((child) => deepFreeze(child, seen));
    return Object.freeze(value);
}

export function generate(dataset, options = {}) {
    const {
        craftType = 'knit',
        terminology = 'uk',
        stitchCount = 50,
        paletteName = 'default',
        numColours = 10,
        colourKeyMin = null,
        colourKeyMax = null,
    } = options;

    const tempUnit = dataset.request.tempUnit;
    const temps = dataset.observations.map(d => d.temp);
    const dataMin = Math.min(...temps);
    const dataMax = Math.max(...temps);

    const smart = calculateSmartDefaults(dataMin, dataMax, numColours);
    const min = colourKeyMin !== null ? colourKeyMin : smart.min;
    const max = colourKeyMax !== null ? colourKeyMax : smart.max;

    const colourKey = buildColourKey(min, max, numColours, paletteName);

    const bands = dataset.observations.map(day => {
        const colourEntry = getColor(day.temp, colourKey);
        return {
            date: day.date,
            temp: day.temp,
            colour: colourEntry.colour,
            colourIndex: colourEntry.index,
            colourName: colourEntry.name,
        };
    });

    const rows = bands.map(band => ({ ...band, stitches: stitchCount }));

    const gauge = GAUGE[craftType] || GAUGE.knit;

    const stats = {
        minTemp: Math.min(...temps),
        maxTemp: Math.max(...temps),
        avgTemp: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
        totalDays: rows.length,
        widthInches: Math.round((stitchCount / gauge.stitchesPerInch) * 10) / 10,
        heightInches: Math.round((rows.length / gauge.rowsPerInch) * 10) / 10,
        gauge,
    };

    const unitSymbol = tempUnit === 'fahrenheit' ? '°F' : '°C';
    const instructions = [];
    if (craftType === 'knit') {
        const castOn = 'Cast on';
        const bindOff = terminology === 'uk' ? 'Cast off' : 'Bind off';
        instructions.push(`${castOn} ${stitchCount} stitches.`);
        rows.forEach((row, i) => {
            const dateObj = new Date(row.date + 'T00:00:00');
            const month = dateObj.toLocaleString('en-GB', { month: 'short' });
            const day = dateObj.getDate();
            instructions.push(`Row ${i + 1} (${month} ${day}): Knit across in C${row.colourIndex} ${row.colourName} (${row.temp}${unitSymbol})`);
        });
        instructions.push(`${bindOff}.`);
    } else {
        const dc = terminology === 'uk' ? 'Double crochet' : 'Single crochet';
        instructions.push(`Chain ${stitchCount + 1}.`);
        rows.forEach((row, i) => {
            const dateObj = new Date(row.date + 'T00:00:00');
            const month = dateObj.toLocaleString('en-GB', { month: 'short' });
            const day = dateObj.getDate();
            instructions.push(`Row ${i + 1} (${month} ${day}): ${dc} in each stitch across in C${row.colourIndex} ${row.colourName} (${row.temp}${unitSymbol})`);
        });
        instructions.push('Fasten off.');
    }

    return deepFreeze({
        dataset,
        settings: { craftType, terminology, stitchCount, paletteName, numColours, colourKeyMin, colourKeyMax },
        design: { bands, colourKey, stats, min, max, tempUnit },
        pattern: { rows, instructions },
    });
}

export function renderProject(project, containers) {
    const staged = Object.fromEntries(
        Object.entries(containers).map(([name, container]) => [name, container.cloneNode(false)])
    );
    const unit = project.design.tempUnit === 'fahrenheit' ? '°F' : '°C';

    renderStats(project.design.stats, staged.stats, unit);
    renderGrid(project.design.bands, staged.grid);
    renderColourKey(project.design.colourKey, staged.colourKey, project.design.bands);
    renderInstructions(project.pattern, staged.instructions);

    Object.entries(containers).forEach(([name, container]) => {
        container.replaceChildren(...staged[name].childNodes);
    });
}

export function renderGrid(bands, container) {
    container.innerHTML = '';
    bands.forEach(band => {
        const rowEl = document.createElement('div');
        rowEl.className = 'pattern-row';
        rowEl.style.background = band.colour;
        rowEl.setAttribute('data-tooltip', `${band.date}: ${band.temp}°`);
        container.appendChild(rowEl);
    });
}

export function renderStats(stats, container, unit = '°') {
    const gauge = stats.gauge;
    container.innerHTML = `
        <div class="stats-row">
            <div class="stat-card">
                <div class="stat-value">${stats.minTemp}${unit}</div>
                <div class="stat-label">Coldest</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.maxTemp}${unit}</div>
                <div class="stat-label">Warmest</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.avgTemp}${unit}</div>
                <div class="stat-label">Average</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.totalDays}</div>
                <div class="stat-label">Days</div>
            </div>
        </div>
        <div class="stats-row stats-size">
            <div class="stat-card">
                <div class="stat-value">${stats.widthInches}"</div>
                <div class="stat-label">Est. Width</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.heightInches}"</div>
                <div class="stat-label">Est. Height</div>
            </div>
        </div>
        <div class="stats-gauge-note">
            Based on ${gauge.stitchesPerInch} stitches/inch and ${gauge.rowsPerInch} rows/inch.
            Actual size varies with yarn and tension.
        </div>
    `;
}

export function renderColourKey(colourKey, container, bands) {
    const rowCounts = {};
    if (bands) {
        bands.forEach(band => {
            rowCounts[band.colourIndex] = (rowCounts[band.colourIndex] || 0) + 1;
        });
    }

    container.innerHTML = `
        <div class="colour-key-bar">
            ${colourKey.map(entry => `
                <div class="colour-key-block" style="background: ${entry.colour};" data-tooltip="C${entry.index}: ${entry.name} (${entry.label})"></div>
            `).join('')}
        </div>
        <div class="colour-key-labels">
            <span>${colourKey[0].min}°</span>
            <span>${colourKey[colourKey.length - 1].max}°</span>
        </div>
        <div class="colour-key-list">
            ${colourKey.map(entry => {
                const count = rowCounts[entry.index] || 0;
                return `
                <div class="colour-key-item">
                    <span class="colour-key-swatch" style="background: ${entry.colour};"></span>
                    <span class="colour-key-id">C${entry.index}</span>
                    <span class="colour-key-name">${entry.name}</span>
                    <span class="colour-key-range">${entry.label}</span>
                    <span class="colour-key-rows">${count} rows</span>
                </div>`;
            }).join('')}
        </div>
    `;
}

export function renderInstructions(pattern, container) {
    const initialCount = 30;
    const allLines = pattern.instructions;
    const colourMap = {};
    pattern.rows.forEach(row => {
        colourMap[row.colourIndex] = row.colour;
    });

    function renderLines(lines) {
        container.innerHTML = lines.map(line => {
            const match = line.match(/C(\d+)/);
            const colourIndex = match ? parseInt(match[1]) : null;
            const colour = colourIndex ? colourMap[colourIndex] : '#ccc';
            return `<div class="instruction-line"><span class="instruction-swatch" style="background:${colour};"></span>${line}</div>`;
        }).join('');
    }

    renderLines(allLines.slice(0, initialCount));

    if (allLines.length > initialCount) {
        const showAllBtn = document.createElement('button');
        showAllBtn.className = 'btn btn-secondary';
        showAllBtn.textContent = `Show all ${allLines.length} rows`;
        showAllBtn.style.marginTop = '0.5rem';
        showAllBtn.addEventListener('click', () => {
            renderLines(allLines);
            showAllBtn.remove();
        });
        container.appendChild(showAllBtn);
    }
}

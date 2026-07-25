const Pattern = (() => {
    function generate(weatherData, options = {}) {
        const {
            stitchCount = 50,
            paletteName = 'default',
            numColours = 10,
            colourKeyMin = null,
            colourKeyMax = null,
        } = options;

        const temps = weatherData.days.map(d => d.temp);
        const dataMin = Math.min(...temps);
        const dataMax = Math.max(...temps);

        const smart = ColorMapper.calculateSmartDefaults(dataMin, dataMax, numColours);
        const min = colourKeyMin !== null ? colourKeyMin : smart.min;
        const max = colourKeyMax !== null ? colourKeyMax : smart.max;

        const colourKey = ColorMapper.buildColourKey(min, max, numColours, paletteName);

        const rows = weatherData.days.map(day => {
            const colourEntry = ColorMapper.getColor(day.temp, colourKey);
            return {
                date: day.date,
                temp: day.temp,
                colour: colourEntry.colour,
                colourIndex: colourEntry.index,
                colourName: colourEntry.name,
                stitches: stitchCount,
            };
        });

        const stats = {
            minTemp: Math.min(...temps),
            maxTemp: Math.max(...temps),
            avgTemp: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10,
            totalDays: rows.length,
        };

        const instructions = rows.map((row, i) => {
            const dateObj = new Date(row.date + 'T00:00:00');
            const month = dateObj.toLocaleString('en-GB', { month: 'short' });
            const day = dateObj.getDate();
            return `Row ${i + 1} (${month} ${day}): ${row.stitches} stitches, C${row.colourIndex} ${row.colourName} (${row.temp}°)`;
        });

        return {
            rows,
            stats,
            colourKey,
            instructions,
            options: { stitchCount, paletteName, numColours, min, max },
        };
    }

    function renderGrid(pattern, container) {
        container.innerHTML = '';
        pattern.rows.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'pattern-row';
            for (let s = 0; s < row.stitches; s++) {
                const cell = document.createElement('div');
                cell.className = 'pattern-cell';
                cell.style.background = row.colour;
                cell.setAttribute('data-tooltip', `${row.date}: ${row.temp}°`);
                rowEl.appendChild(cell);
            }
            container.appendChild(rowEl);
        });
    }

    function renderStats(stats, container, unit = '°') {
        container.innerHTML = `
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
        `;
    }

    function renderColourKey(colourKey, container) {
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
                ${colourKey.map(entry => `
                    <div class="colour-key-item">
                        <span class="colour-key-swatch" style="background: ${entry.colour};"></span>
                        <span class="colour-key-id">C${entry.index}</span>
                        <span class="colour-key-name">${entry.name}</span>
                        <span class="colour-key-range">${entry.label}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderInstructions(pattern, container) {
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

    return { generate, renderGrid, renderStats, renderColourKey, renderInstructions };
})();

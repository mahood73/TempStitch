const Pattern = (() => {
    function generate(weatherData, options = {}) {
        const {
            craftType = 'knit',
            terminology = 'uk',
            tempUnit = 'celsius',
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
            widthInches: Math.round((stitchCount / 4.5) * 10) / 10,
            heightInches: Math.round((rows.length / 6) * 10) / 10,
        };

        const unitSymbol = options.tempUnit === 'fahrenheit' ? '°F' : '°C';
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

        return {
            rows,
            stats,
            colourKey,
            instructions,
            options: { craftType, terminology, tempUnit, stitchCount, paletteName, numColours, min, max },
        };
    }

    function renderGrid(pattern, container) {
        container.innerHTML = '';
        pattern.rows.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'pattern-row';
            rowEl.style.background = row.colour;
            rowEl.setAttribute('data-tooltip', `${row.date}: ${row.temp}°`);
            container.appendChild(rowEl);
        });
    }

    function renderStats(stats, container, unit = '°') {
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
                    <div class="stat-label">Width</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.heightInches}"</div>
                    <div class="stat-label">Height</div>
                </div>
            </div>
        `;
    }

    function renderColourKey(colourKey, container, rows) {
        const rowCounts = {};
        if (rows) {
            rows.forEach(row => {
                rowCounts[row.colourIndex] = (rowCounts[row.colourIndex] || 0) + 1;
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

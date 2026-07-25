const ColorMapper = (() => {
    const palettes = {
        default: [
            [30, 58, 138],
            [59, 130, 246],
            [20, 184, 166],
            [245, 158, 11],
            [239, 68, 68],
        ],
        warm: [
            [124, 58, 237],
            [236, 72, 153],
            [249, 115, 22],
            [234, 88, 12],
            [220, 38, 38],
        ],
        cool: [
            [67, 56, 202],
            [79, 70, 229],
            [14, 165, 233],
            [6, 182, 212],
            [20, 184, 166],
        ],
        pastel: [
            [199, 210, 254],
            [196, 181, 253],
            [167, 243, 208],
            [254, 240, 138],
            [254, 202, 202],
        ],
        monochrome: [
            [255, 255, 255],
            [209, 213, 219],
            [156, 163, 175],
            [75, 85, 99],
            [17, 24, 39],
        ],
    };

    function rgbToHex(rgb) {
        return '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');
    }

    function interpolateColor(c1, c2, t) {
        return [
            Math.round(c1[0] + (c2[0] - c1[0]) * t),
            Math.round(c1[1] + (c2[1] - c1[1]) * t),
            Math.round(c1[2] + (c2[2] - c1[2]) * t),
        ];
    }

    function generateColourScale(paletteName, numColours) {
        const base = palettes[paletteName] || palettes.default;
        const scale = [];
        for (let i = 0; i < numColours; i++) {
            const t = numColours === 1 ? 0 : i / (numColours - 1);
            const baseT = t * (base.length - 1);
            const idx = Math.min(Math.floor(baseT), base.length - 2);
            const localT = baseT - idx;
            scale.push(rgbToHex(interpolateColor(base[idx], base[idx + 1], localT)));
        }
        return scale;
    }

    function calculateSmartDefaults(dataMin, dataMax) {
        const range = dataMax - dataMin;
        if (range <= 0) return { increment: 5, numColours: 10, min: dataMin - 5, max: dataMax + 5 };

        let numColours = Math.round(range / 5);
        numColours = Math.max(8, Math.min(14, numColours));

        let increment = range / numColours;
        if (increment <= 3) increment = 3;
        else if (increment <= 4) increment = 4;
        else if (increment <= 6) increment = 5;
        else if (increment <= 8) increment = 6;
        else increment = 10;

        numColours = Math.ceil(range / increment);
        numColours = Math.max(8, Math.min(14, numColours));

        const min = Math.floor(dataMin / increment) * increment;
        const max = Math.ceil(dataMax / increment) * increment;

        return { increment, numColours, min, max };
    }

    function buildColourKey(min, max, increment, paletteName) {
        const scale = generateColourScale(paletteName, Math.ceil((max - min) / increment));
        const key = [];
        let temp = min;
        let i = 0;
        while (temp < max && i < scale.length) {
            const rangeMin = temp;
            const rangeMax = temp + increment;
            key.push({
                min: rangeMin,
                max: rangeMax,
                label: `${rangeMin}°–${rangeMax - 1}°`,
                colour: scale[i],
            });
            temp = rangeMax;
            i++;
        }
        return key;
    }

    function getColor(temp, colourKey) {
        for (const entry of colourKey) {
            if (temp >= entry.min && temp < entry.max) return entry.colour;
        }
        return colourKey[colourKey.length - 1].colour;
    }

    function buildLegendGradient(colourKey) {
        return `linear-gradient(to right, ${colourKey.map(e => e.colour).join(', ')})`;
    }

    return {
        palettes,
        generateColourScale,
        calculateSmartDefaults,
        buildColourKey,
        getColor,
        buildLegendGradient,
        rgbToHex,
    };
})();

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

    function calculateSmartDefaults(dataMin, dataMax, numColours) {
        const range = dataMax - dataMin;
        if (range <= 0) return { min: dataMin - 5, max: dataMax + 5 };

        const min = Math.floor(dataMin);
        const max = Math.ceil(dataMax);

        return { min, max };
    }

    function buildColourKey(min, max, numColours, paletteName) {
        const scale = generateColourScale(paletteName, numColours);
        const increment = (max - min) / numColours;
        const key = [];
        let temp = min;

        for (let i = 0; i < numColours; i++) {
            const rangeMin = Math.round(temp);
            const rangeMax = Math.round(temp + increment);
            key.push({
                min: rangeMin,
                max: rangeMax,
                label: `${rangeMin}°–${rangeMax - 1}°`,
                colour: scale[i],
            });
            temp += increment;
        }

        return key;
    }

    function getColor(temp, colourKey) {
        for (const entry of colourKey) {
            if (temp >= entry.min && temp < entry.max) return entry.colour;
        }
        return colourKey[colourKey.length - 1].colour;
    }

    return {
        palettes,
        generateColourScale,
        calculateSmartDefaults,
        buildColourKey,
        getColor,
        rgbToHex,
    };
})();

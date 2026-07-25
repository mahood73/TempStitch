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

    function hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s;
        const l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function colourNameFromHex(hex) {
        const { h, s, l } = hexToHsl(hex);
        if (s < 10) {
            if (l < 15) return 'Black';
            if (l < 30) return 'Charcoal';
            if (l < 50) return 'Grey';
            if (l < 75) return 'Silver';
            return 'White';
        }
        if (l < 12) return 'Black';
        if (l > 88) return 'White';

        const low = l < 35;
        const high = l > 65;
        const pale = l > 75;
        const vivid = s > 65;

        let name;
        if (h < 10 || h >= 350) {
            name = low ? 'Burgundy' : vivid ? 'Scarlet' : 'Brick Red';
        } else if (h < 20) {
            name = low ? 'Maroon' : vivid ? 'Crimson' : 'Rose Red';
        } else if (h < 35) {
            name = low ? 'Rust' : high ? 'Peach' : vivid ? 'Orange' : 'Copper';
        } else if (h < 50) {
            name = low ? 'Brown' : high ? 'Cream' : vivid ? 'Amber' : 'Tan';
        } else if (h < 65) {
            name = low ? 'Olive' : high ? 'Lemon' : vivid ? 'Gold' : 'Mustard';
        } else if (h < 80) {
            name = low ? 'Moss' : high ? 'Pale Lime' : 'Lime';
        } else if (h < 100) {
            name = low ? 'Forest' : high ? 'Mint' : vivid ? 'Chartreuse' : 'Sage';
        } else if (h < 140) {
            name = low ? 'Hunter Green' : vivid ? 'Green' : 'Sage Green';
        } else if (h < 160) {
            name = low ? 'Deep Teal' : vivid ? 'Emerald' : 'Jade';
        } else if (h < 175) {
            name = low ? 'Pine' : vivid ? 'Teal' : 'Sea Green';
        } else if (h < 195) {
            name = low ? 'Teal' : vivid ? 'Cyan' : 'Aqua';
        } else if (h < 215) {
            name = low ? 'Steel Blue' : vivid ? 'Cerulean' : 'Powder Blue';
        } else if (h < 240) {
            name = low ? 'Navy' : high ? 'Cornflower' : vivid ? 'Royal Blue' : 'Cobalt';
        } else if (h < 260) {
            name = low ? 'Deep Indigo' : high ? 'Periwinkle' : 'Indigo';
        } else if (h < 280) {
            name = low ? 'Plum' : vivid ? 'Purple' : 'Heather';
        } else if (h < 300) {
            name = low ? 'Grape' : high ? 'Lilac' : 'Violet';
        } else if (h < 320) {
            name = low ? 'Plum' : high ? 'Orchid' : vivid ? 'Magenta' : 'Mauve';
        } else if (h < 335) {
            name = low ? 'Burgundy' : high ? 'Blush' : vivid ? 'Hot Pink' : 'Dusty Rose';
        } else {
            name = low ? 'Maroon' : high ? 'Rose Pink' : 'Rose';
        }

        return name;
    }

    function deduplicateNames(key) {
        const used = {};
        return key.map(entry => {
            let name = entry.name;
            if (used[name]) {
                used[name]++;
                name = `${name} ${used[name]}`;
            } else {
                used[name] = 1;
            }
            return { ...entry, name };
        });
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
                index: i + 1,
                name: colourNameFromHex(scale[i]),
                min: rangeMin,
                max: rangeMax,
                label: `${rangeMin}°–${rangeMax - 1}°`,
                colour: scale[i],
            });
            temp += increment;
        }

        return deduplicateNames(key);
    }

    function getColor(temp, colourKey) {
        for (const entry of colourKey) {
            if (temp >= entry.min && temp < entry.max) return entry;
        }
        return colourKey[colourKey.length - 1];
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

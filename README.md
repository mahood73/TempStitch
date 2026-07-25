# TempStitch

Turn a year of weather into a knitting or crochet pattern.

Enter your location, and TempStitch fetches the daily maximum temperature for a selected year, then generates a colour-coded design and written instructions for a temperature blanket or scarf.

## Features

- **Smart colour scaling** — auto-calculates colour ranges from your local climate
- **5 palettes** — default gradient, warm, cool, pastel, monochrome
- **Live preview** — see the design before generating instructions
- **Numbered colours** — C1–C12 system with names and temperature ranges
- **Year selector** — choose any year from 1940 onwards
- **100% client-side** — no server, no account, no tracking

## Usage

Open `index.html` in a browser, search for a location (or use device location), select a year, and click **Generate Design**.

## Development

No build step required. Edit the HTML, CSS, and JS files directly and refresh the browser.

### Files

```
index.html          — main page
about.html          — about and roadmap
css/styles.css      — styling
js/location.js      — lat/long input, geolocation, and search
js/weather.js       — Open-Meteo API integration
js/color-mapper.js  — temperature-to-colour mapping
js/pattern.js       — design and pattern generation
js/export.js        — image download
js/main.js          — app wiring and event handlers
```

## Roadmap

| Version | Description |
|---------|-------------|
| **v1 (MVP)** | Core functionality, polish, and deployment |
| **v1.1** | Stitch count presets, downloadable instructions, size estimation, colour key grid, favicon, C/F toggle, knit/crochet toggle |
| **v1.5** | Gauge input, PDF export, yarn quantity calculator, zoom, tension-based sizing, logo, stitched preview |
| **v2** | Date range selection, border stitches, aggregation modes |
| **Someday** | Map picker, multiple locations, community gallery |

See [GitHub Issues](https://github.com/mahood73/TempStitch/issues) for details.

## Data

Weather data from [Open-Meteo](https://open-meteo.com) (free, no API key required).

## License

MIT

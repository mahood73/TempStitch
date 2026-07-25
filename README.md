# TempStitch

Turn a year of weather into a knitting or crochet pattern.

Enter your location, and TempStitch fetches the daily maximum temperature for the past year, then generates a colour-coded design and written instructions for a temperature blanket or scarf.

## Features

- **Smart colour scaling** — auto-calculates colour ranges from your local climate
- **5 palettes** — default gradient, warm, cool, pastel, monochrome
- **Live preview** — see the design before generating instructions
- **Pattern export** — download as PNG image
- **100% client-side** — no server, no account, no tracking

## Usage

Open `index.html` in a browser, enter your latitude and longitude (or use device location), and click **Generate Design**.

## Development

No build step required. Edit the HTML, CSS, and JS files directly and refresh the browser.

### Files

```
index.html          — main page
css/styles.css      — styling
js/location.js      — lat/long input and geolocation
js/weather.js       — Open-Meteo API integration
js/color-mapper.js  — temperature-to-colour mapping
js/pattern.js       — design and pattern generation
js/export.js        — image download
js/main.js          — app wiring and event handlers
```

## Data

Weather data from [Open-Meteo](https://open-meteo.com) (free, no API key required).

## License

MIT

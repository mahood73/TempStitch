# TempStitch

TempStitch makes a knitting or crochet pattern from daily weather data.

Select a location and a year. TempStitch gets the daily maximum temperatures. It then makes a colour design and pattern instructions.

## Features

- Calculates temperature ranges from the climate at the selected location.
- Has five colour palettes: default, warm, cool, pastel, and monochrome.
- Shows a design preview before it makes the instructions.
- Uses colour IDs C1 through C12. Each ID has a name and temperature range.
- Lets you select a year from 1940 to the present year.
- Runs in the browser. It does not need an account, a server, or tracking.

## Use TempStitch

1. Start a web server for the project folder.
2. Open the server URL in a web browser.
3. Search for a location, or use the device location.
4. Select a year.
5. Select **Generate Design**.

For example, run this command in the project root:

```sh
npx serve .
```

## Development

TempStitch has no build step. The browser loads the JavaScript files as ES modules.

Do not open the application with a `file://` URL. ES modules need a web server origin. You can use VS Code Live Server, `python3 -m http.server`, or another static web server.

### Run locally

1. Start a static web server in the project root.
2. Open the server URL in a web browser.

### Run tests

```sh
npm test
```

The tests use the Node.js test runner (`node --test`). They do not use third-party dependencies. The tests use the same ES module interfaces as the browser application.

### Files

```text
index.html              Main page and module entry point.
about.html              About page and roadmap.
css/styles.css          Style rules.
js/location.js          Location input, geolocation, and search.
js/weather.js           Open-Meteo API connection.
js/weather-dataset.js   Weather data types, validation, and error categories.
js/color-mapper.js      Temperature-to-colour mapping.
js/pattern.js           Design and pattern generation.
js/export.js            Export composition and file downloads.
js/main.js              Application setup and event handlers.
js/*.test.js            Tests.
```

## Roadmap

### Version 1

Complete the core functions, final user-interface work, and deployment.

### Version 1.1

- Add stitch-count presets.
- Add downloadable instructions.
- Add size estimates.
- Add a colour-key grid.
- Add a favicon.
- Add Celsius and Fahrenheit selection.
- Add knitting and crochet selection.
- Add UK and US terms.
- Improve the layout and user interface.
- Add row counts.

### Version 1.5

- Add gauge input.
- Add PDF export.
- Add a yarn-quantity calculator.
- Add zoom controls.
- Add tension-based size estimates.
- Add a logo.
- Add a stitched preview.

### Version 2

- Add date-range selection.
- Add border stitches.
- Add data aggregation modes.

### Future work

- Add a map picker.
- Support more than one location.
- Add a community gallery.

See [GitHub Issues](https://github.com/mahood73/TempStitch/issues) for more information.

## Data source

TempStitch gets weather data from [Open-Meteo](https://open-meteo.com). Open-Meteo is free and does not need an API key.

## License

TempStitch uses the GNU Affero General Public License version 3.0 (AGPL-3.0).

You can use, change, and host TempStitch. If you make a changed version available over a network, the AGPL requires you to provide the related source code.

See [LICENSE](LICENSE) for the complete license text.

## Contribute

You can submit issues, feature requests, and pull requests.

Tell us if you make something useful with TempStitch.

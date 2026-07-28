# Verify TempStitch

- Launch the static app with `npx serve . -l 8765`.
- Use Playwright against `http://localhost:8765` to drive the browser UI and capture a screenshot under `/tmp`.
- For generated-pattern flows, search for a location, select a search result, and click Create; wait for `#pattern-section` to become visible.
- For keyboard focus checks, start from a fresh page and use `Tab`; wait about 250 ms before reading computed styles because focus rings transition.

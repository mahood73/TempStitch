# 0001 — 100% client-side architecture

The app runs entirely in the browser with no backend. Weather data is fetched directly from the Open-Meteo API (CORS-friendly), and all pattern generation happens client-side.

This was chosen over a Cloudflare Workers backend because: (1) the Open-Meteo API is free and requires no proxy, (2) zero server costs, (3) trivial deployment (static hosting), and (4) easier to swap weather API providers later (just change the fetch function). The trade-off is that we can't cache responses or do server-side processing, but for a single-user tool fetching one year of daily data, that's negligible.
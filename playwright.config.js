import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    use: {
        baseURL: 'http://localhost:8765',
        viewport: { width: 1280, height: 800 },
    },
    webServer: {
        command: 'npx serve . -p 8765 --no-clipboard',
        port: 8765,
        timeout: 10000,
        reuseExistingServer: true,
    },
});

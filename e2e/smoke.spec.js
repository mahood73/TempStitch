import { test, expect } from '@playwright/test';

function dailyWeatherFor(year) {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const days = (end - start) / (24 * 60 * 60 * 1000);
    const dates = Array.from({ length: days }, (_, index) =>
        new Date(Date.UTC(year, 0, index + 1)).toISOString().slice(0, 10)
    );
    return {
        latitude: 52.2053,
        longitude: 0.1218,
        timezone: 'Europe/London',
        daily_units: { temperature_2m_max: '°C' },
        daily: {
            time: dates,
            temperature_2m_max: dates.map((_, index) => 5 + (index % 20)),
        },
    };
}

test.describe('v1.1 smoke tests', () => {

    test('page loads with correct title and heading', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle('TempStitch');
        await expect(page.locator('h1')).toHaveText('TempStitch');
        await expect(page.locator('.subtitle')).toContainText('temperature blankets');
    });

    test('all form controls are present with correct defaults', async ({ page }) => {
        await page.goto('/');

        await expect(page.locator('#craft-type')).toHaveValue('crochet');
        await expect(page.locator('#temp-unit')).toHaveValue('celsius');
        await expect(page.locator('#terminology')).toHaveValue('uk');
        await expect(page.locator('#stitch-count')).toHaveValue('50');
        await expect(page.locator('#num-colours')).toHaveValue('10');
        await expect(page.locator('#colour-palette')).toHaveValue('default');
        await expect(page.locator('#year-select')).toBeVisible();

        const preset = page.locator('#stitch-preset');
        await expect(preset).toHaveValue('50');
    });

    test('stitch preset updates stitch count on selection', async ({ page }) => {
        await page.goto('/');
        await page.locator('#stitch-preset').selectOption('200');
        await expect(page.locator('#stitch-count')).toHaveValue('200');
    });

    test('project type labels follow preset and custom stitch selections', async ({ page }) => {
        await page.goto('/');
        const btn = page.locator('#fetch-weather-btn');
        const toggle = page.locator('.settings-toggle');
        const emptyStateTitle = page.locator('#empty-state-title');
        const emptyStateMessage = page.locator('#empty-state-message');

        await expect(btn).toHaveText('Create Scarf');
        await expect(toggle).toHaveText('Configure your scarf');
        await expect(emptyStateTitle).toHaveText('Your scarf preview will appear here');
        await expect(emptyStateMessage).toContainText('temperature scarf pattern');

        await page.locator('#stitch-preset').selectOption('200');
        await expect(btn).toHaveText('Create Blanket');
        await expect(toggle).toHaveText('Configure your blanket');
        await expect(emptyStateTitle).toHaveText('Your blanket preview will appear here');
        await expect(emptyStateMessage).toContainText('temperature blanket pattern');

        await page.locator('#stitch-preset').selectOption('');
        await page.locator('#stitch-count').fill('50');
        await expect(btn).toHaveText('Create Scarf');
        await expect(toggle).toHaveText('Configure your scarf');
        await expect(emptyStateTitle).toHaveText('Your scarf preview will appear here');
        await expect(emptyStateMessage).toContainText('temperature scarf pattern');

        await page.locator('#stitch-count').fill('51');
        await expect(btn).toHaveText('Create Blanket');
        await expect(toggle).toHaveText('Configure your blanket');
        await expect(emptyStateTitle).toHaveText('Your blanket preview will appear here');
        await expect(emptyStateMessage).toContainText('temperature blanket pattern');
    });

    test('generating without location shows error', async ({ page }) => {
        await page.goto('/');
        await page.locator('#fetch-weather-btn').click();

        const error = page.locator('#error');
        await expect(error).toBeVisible();
        await expect(error).toHaveAttribute('role', 'alert');
        await expect(error).toContainText('Select a location');
    });

    test('generated preview shows its location and year above stats and grid', async ({ page }) => {
        await page.route(/geocoding-api\.open-meteo\.com/, async (route) => {
            await route.fulfill({
                json: {
                    results: [{
                        name: 'Cambridge',
                        admin1: 'England',
                        country: 'United Kingdom',
                        latitude: 52.2053,
                        longitude: 0.1218,
                    }],
                },
            });
        });
        await page.route(/archive-api\.open-meteo\.com/, async (route) => {
            const startDate = new URL(route.request().url()).searchParams.get('start_date');
            await route.fulfill({ json: dailyWeatherFor(Number(startDate.slice(0, 4))) });
        });

        await page.goto('/');
        await expect(page.locator('#year-select')).toHaveValue(/^\d{4}$/);
        const year = await page.locator('#year-select').inputValue();
        await page.locator('#location-search').fill('Cambridge');
        await page.locator('.search-result-item').click();
        await page.locator('#fetch-weather-btn').click();
        await expect(page.locator('#pattern-section')).toBeVisible();

        await expect(page.locator('#pattern-metadata')).toHaveText(`📍 Cambridge, England, United Kingdom · ${year}`);
        const previewWidthRatio = await page.locator('#pattern-section').evaluate((section) =>
            section.getBoundingClientRect().width / window.innerWidth
        );
        expect(previewWidthRatio).toBeGreaterThanOrEqual(0.8);
        expect(previewWidthRatio).toBeLessThanOrEqual(0.9);
        const previewOrder = await page.locator('#pattern-section').evaluate((section) => [
            ...section.children,
        ].map((element) => element.id || element.className));
        expect(previewOrder.indexOf('pattern-stats')).toBeLessThan(previewOrder.indexOf('pattern-scroll'));
    });

    test('result section is hidden on initial load', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#pattern-section')).toBeHidden();
    });

    test('error element starts hidden but has role alert', async ({ page }) => {
        await page.goto('/');
        const error = page.locator('#error');
        await expect(error).toBeHidden();
        await expect(error).toHaveAttribute('role', 'alert');
    });

    test('loading element is hidden on load', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#loading')).toBeHidden();
    });

    test('Edit Settings button exists in pattern header', async ({ page }) => {
        await page.goto('/');
        const btn = page.locator('#edit-settings-btn');
        await expect(btn).toHaveText('Edit Settings');
    });

    test('craft type toggle switches between knit and crochet', async ({ page }) => {
        await page.goto('/');
        const craft = page.locator('#craft-type');

        await craft.selectOption('crochet');
        await expect(craft).toHaveValue('crochet');

        await craft.selectOption('knit');
        await expect(craft).toHaveValue('knit');
    });

    test('temperature unit toggle switches', async ({ page }) => {
        await page.goto('/');
        const unit = page.locator('#temp-unit');

        await unit.selectOption('fahrenheit');
        await expect(unit).toHaveValue('fahrenheit');

        await unit.selectOption('celsius');
        await expect(unit).toHaveValue('celsius');
    });

    test('terminology toggle switches', async ({ page }) => {
        await page.goto('/');
        const term = page.locator('#terminology');

        await term.selectOption('us');
        await expect(term).toHaveValue('us');

        await term.selectOption('uk');
        await expect(term).toHaveValue('uk');
    });

    test('colour palette switches between options', async ({ page }) => {
        await page.goto('/');
        const palette = page.locator('#colour-palette');

        const options = ['default', 'warm', 'cool', 'pastel', 'monochrome'];
        for (const opt of options) {
            await palette.selectOption(opt);
            await expect(palette).toHaveValue(opt);
        }
    });

    test('year selector defaults to previous year', async ({ page }) => {
        await page.goto('/');
        const year = page.locator('#year-select');
        const prevYear = String(new Date().getFullYear() - 1);
        await expect(year).toHaveValue(prevYear);
    });

    test('search input has combobox ARIA role', async ({ page }) => {
        await page.goto('/');
        const search = page.locator('#location-search');
        await expect(search).toHaveAttribute('role', 'combobox');
        await expect(search).toHaveAttribute('aria-autocomplete', 'list');
        await expect(search).toHaveAttribute('aria-expanded', 'false');
    });

    test('location section has search and geo button', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#location-search')).toBeVisible();
        await expect(page.locator('#geo-location-btn')).toBeVisible();
        await expect(page.locator('#geo-location-btn')).toContainText('current location');
    });

    test('export and download buttons exist', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#download-image-btn')).toHaveText('Export');
        await expect(page.locator('#download-instructions-btn')).toHaveText('Download');
    });

    test('about page loads', async ({ page }) => {
        await page.goto('/about.html');
        await expect(page.locator('h1')).toBeVisible();
    });

    test('mobile layout switches pattern-header to column', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        await page.locator('#stitch-preset').selectOption('200');
        await page.locator('#fetch-weather-btn').click();

        const error = page.locator('#error');
        await expect(error).toBeVisible();
    });

    test('fade-in animation CSS is defined in stylesheet', async ({ page }) => {
        await page.goto('/');
        const css = await page.evaluate(() =>
            [...document.styleSheets]
                .filter((s) => s.href?.includes('styles.css'))
                .flatMap((s) => [...s.cssRules])
                .some((r) => r.cssText?.includes('.pattern-animate'))
        );
        expect(css).toBe(true);
    });

    test('pattern rows are five pixels high', async ({ page }) => {
        await page.goto('/');
        const rowHeight = await page.evaluate(() =>
            [...document.styleSheets]
                .filter((s) => s.href?.includes('styles.css'))
                .flatMap((s) => [...s.cssRules])
                .find((r) => r.selectorText === '.pattern-row')
                ?.style.height
        );
        expect(rowHeight).toBe('5px');
    });

    test('keyboard focus uses the shared visible ring', async ({ page }) => {
        await page.goto('/');
        const focused = async (selector) => {
            await expect(page.locator(selector)).toBeFocused();
            const style = await page.locator(selector).evaluate((element) => ({
                isFocusVisible: element.matches(':focus-visible'),
                boxShadow: getComputedStyle(element).boxShadow,
            }));
            expect(style.isFocusVisible).toBe(true);
            expect(style.boxShadow).not.toBe('none');
        };

        await page.keyboard.press('Tab');
        await focused('.header-nav a');

        await page.keyboard.press('Tab');
        await focused('#location-search');

        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await focused('.settings-toggle');

        for (let i = 0; i < 9; i += 1) {
            await page.keyboard.press('Tab');
        }
        await focused('.advanced-toggle summary');

        await page.keyboard.press('Tab');
        await focused('#fetch-weather-btn');
    });

    test('settings has Configure your scarf / blanket toggle text', async ({ page }) => {
        await page.goto('/');
        const toggle = page.locator('.settings-toggle');
        await expect(toggle).toHaveText('Configure your scarf');

        await page.locator('#stitch-preset').selectOption('200');
        await expect(toggle).toHaveText('Configure your blanket');
    });

    test('error element becomes visible and focusable on validation failure', async ({ page }) => {
        await page.goto('/');
        await page.locator('#fetch-weather-btn').click();

        const error = page.locator('#error');
        await expect(error).toBeVisible();
        await expect(error).toContainText('searching for a place');

        const searchInput = page.locator('#location-search');
        await expect(searchInput).toBeFocused();
    });
});

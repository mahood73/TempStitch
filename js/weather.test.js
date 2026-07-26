import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getDateRange } from './weather.js';

describe('Weather.getDateRange', () => {
    it('returns full year when year is given', () => {
        const range = getDateRange(2024);
        assert.equal(range.start, '2024-01-01');
        assert.equal(range.end, '2024-12-31');
    });

    it('returns recent 365 days when no year given', () => {
        const range = getDateRange();
        const end = new Date(range.end);
        const start = new Date(range.start);
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
        assert.equal(diffDays, 364);
    });
});

import { search } from './location.js';

export function setupSearch(els, { save, setStatus }) {
    let activeIndex = -1;
    let currentResults = [];
    let searchTimeout = null;

    function clearHighlight(items) {
        items.forEach((item) => item.classList.remove('search-result-active'));
    }

    function updateActiveDescendant(items) {
        const id = `search-result-${activeIndex}`;
        els.searchInput.setAttribute('aria-activedescendant', id);
        clearHighlight(items);
        items[activeIndex]?.classList.add('search-result-active');
        items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }

    function hideSearchResults() {
        els.searchResults.style.display = 'none';
        els.searchResults.innerHTML = '';
        els.searchResults.removeAttribute('role');
        els.searchInput.setAttribute('aria-expanded', 'false');
        els.searchInput.removeAttribute('aria-activedescendant');
        activeIndex = -1;
        currentResults = [];
    }

    function showSearchResults(results) {
        currentResults = results;
        els.searchResults.setAttribute('role', 'listbox');

        if (results.length === 0) {
            els.searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
            els.searchResults.style.display = 'block';
            els.searchInput.setAttribute('aria-expanded', 'true');
            return;
        }

        els.searchResults.innerHTML = results.map((r, i) => {
            const parts = [r.name];
            if (r.admin1) parts.push(r.admin1);
            if (r.country) parts.push(r.country);
            const meta = parts.join(', ');
            const coords = `${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)}`;
            return `<div class="search-result-item" role="option" id="search-result-${i}" data-index="${i}">
                <div class="search-result-name">${r.name}</div>
                <div class="search-result-meta">${meta} &middot; ${coords}</div>
            </div>`;
        }).join('');

        els.searchResults.querySelectorAll('.search-result-item').forEach((item) => {
            item.addEventListener('click', () => {
                const r = results[parseInt(item.dataset.index)];
                selectResult(r);
            });
        });

        els.searchResults.style.display = 'block';
        els.searchInput.setAttribute('aria-expanded', 'true');
        activeIndex = -1;
        els.searchInput.removeAttribute('aria-activedescendant');
    }

    function selectResult(r) {
        els.lat.value = r.latitude.toFixed(4);
        els.lon.value = r.longitude.toFixed(4);
        const parts = [r.name];
        if (r.admin1) parts.push(r.admin1);
        if (r.country) parts.push(r.country);
        els.searchInput.value = parts.join(', ');
        hideSearchResults();
        save(r.latitude, r.longitude);
        setStatus(`Location set: ${r.name}`, 'success');
    }

    async function handleSearch() {
        const query = els.searchInput.value.trim();
        if (query.length < 2) {
            hideSearchResults();
            return;
        }

        try {
            const results = await search(query);
            showSearchResults(results);
        } catch (err) {
            hideSearchResults();
        }
    }

    els.searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(handleSearch, 300);
    });

    els.searchInput.addEventListener('keydown', (e) => {
        const isVisible = els.searchResults.style.display === 'block';
        const items = els.searchResults.querySelectorAll('.search-result-item');

        if (e.key === 'Escape') {
            hideSearchResults();
            return;
        }

        if (e.key === 'ArrowDown' && isVisible && items.length > 0) {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, items.length - 1);
            updateActiveDescendant(items);
            return;
        }

        if (e.key === 'ArrowUp' && isVisible && items.length > 0) {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, -1);
            clearHighlight(items);
            if (activeIndex === -1) {
                els.searchInput.removeAttribute('aria-activedescendant');
            } else {
                updateActiveDescendant(items);
            }
            return;
        }

        if (e.key === 'Enter' && isVisible && activeIndex >= 0 && activeIndex < items.length) {
            e.preventDefault();
            items[activeIndex].click();
        }
    });

    document.addEventListener('click', (e) => {
        if (!els.searchResults.contains(e.target) && e.target !== els.searchInput) {
            hideSearchResults();
        }
    });
}

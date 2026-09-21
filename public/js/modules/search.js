import { DB_COLUMNS } from '../config/supabase.js';
import { fetchPaginatedData, resetPagination } from './table.js';

export function initSearch() {
    const searchCategory = document.getElementById('searchCategory');
    const searchInput = document.getElementById('searchInput');

    if (!searchCategory || !searchInput) return;

    if (searchCategory.options.length <= 1) {
        DB_COLUMNS.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col.replace(/_/g, ' ').toUpperCase();
            searchCategory.appendChild(option);
        });
    }

    let searchTimeout = null;

    function handleSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            resetPagination();
            fetchPaginatedData();
        }, 500);
    }

    searchInput.addEventListener('input', handleSearch);
    searchCategory.addEventListener('change', handleSearch);
}

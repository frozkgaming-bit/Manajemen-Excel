import { DB_COLUMNS } from '../config/supabase.js';
import { fetchPaginatedData, resetPagination } from './table.js';

export function initSearch() {
    const searchCategory = document.getElementById('searchCategory');
    const searchInput = document.getElementById('searchInput');
    const btnSearch = document.getElementById('btnSearch');

    if (!searchCategory || !searchInput || !btnSearch) return;

    if (searchCategory.options.length <= 1) {
        DB_COLUMNS.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col.replace(/_/g, ' ').toUpperCase();
            searchCategory.appendChild(option);
        });
    }

    function handleSearch() {
        resetPagination();
        fetchPaginatedData();
    }

    // Search on button click
    btnSearch.addEventListener('click', handleSearch);
    
    // Search on Enter key press
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Also trigger search when category changes
    searchCategory.addEventListener('change', handleSearch);
}

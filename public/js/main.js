import { initAuth } from './modules/auth.js';
import { fetchPaginatedData, initTableScroll, resetPagination } from './modules/table.js';
import { initExcelHandlers } from './modules/excel.js';
import { initSearch } from './modules/search.js';
import { fetchServerCounts } from './modules/stats.js';

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initTableScroll();
    initSearch();
    initExcelHandlers();

    const btnPullData = document.getElementById('btnPullData');
    if (btnPullData) {
        btnPullData.addEventListener('click', async () => {
            resetPagination();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = "";
            
            fetchServerCounts();
            await fetchPaginatedData();
        });
    }
});

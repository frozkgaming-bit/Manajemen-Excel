import { initAuth } from './modules/auth.js';
import { fetchPaginatedData, initTableScroll, resetPagination } from './modules/table.js';
import { initExcelHandlers } from './modules/excel.js';
import { initSearch } from './modules/search.js';
import { fetchServerCounts } from './modules/stats.js';
import { initStorageHandlers } from './modules/storageHandler.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're on login page or dashboard
    const isLoginPage = window.location.pathname.includes('login.html') || document.getElementById('loginSection');
    const isDashboard = document.getElementById('appSection') || document.getElementById('tableBody');
    
    if (isLoginPage && !isDashboard) {
        // Login page
        initAuth();
    } else if (isDashboard) {
        // Dashboard page
        initTableScroll();
        initSearch();
        initExcelHandlers();
        initStorageHandlers();

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
    }
    
    // Check if user is already logged in (for dashboard)
    const { supabaseClient } = await import('./config/supabase.js');
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session && !isLoginPage) {
        window.location.href = 'login.html';
    }
});
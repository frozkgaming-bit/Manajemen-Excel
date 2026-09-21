import { supabaseClient, TABLE_NAME, DB_COLUMNS } from '../config/supabase.js';

let allData = [];
let filteredData = [];
let headers = [];
let currentIndex = 0;
const batchSize = 50;

let currentPullPage = 1;
let isPulling = false;
let hasMorePullData = true;
let currentSearchTerm = "";

// --- Progress Helper Functions ---
export function showProgress(title, percent = 0, text = "") {
    const modal = document.getElementById('progressModal');
    const titleEl = document.getElementById('progressTitle');
    const barEl = document.getElementById('progressBar');
    const textEl = document.getElementById('progressText');

    if (modal) {
        modal.style.display = 'flex';
        if (titleEl) titleEl.innerText = title;
        if (barEl) barEl.style.width = `${percent}%`;
        if (textEl) textEl.innerText = text;
    }
}

export function updateProgress(percent, text) {
    const barEl = document.getElementById('progressBar');
    const textEl = document.getElementById('progressText');
    if (barEl) barEl.style.width = `${percent}%`;
    if (textEl) textEl.innerText = text;
}

export function hideProgress() {
    const modal = document.getElementById('progressModal');
    if (modal) modal.style.display = 'none';
}

let allData = [];
let filteredData = [];
let headers = [];
let currentIndex = 0;
const batchSize = 50;

let currentPullPage = 1;
let isPulling = false;
let hasMorePullData = true;
let currentSearchTerm = "";

export function getHeaders() { return headers; }
export function getAllData() { return allData; }
export function getFilteredData() { return filteredData; }
export function getCurrentIndex() { return currentIndex; }

export function setAllData(val) { allData = val; }
export function setFilteredData(val) { filteredData = val; }
export function setCurrentIndex(val) { currentIndex = val; }
export function setHeaders(val) { headers = val; }

export function setupHeadersIfNeeded() {
    const tableHead = document.getElementById('tableHead');
    if (headers.length === 0) {
        headers = [...DB_COLUMNS];
        let headerHtml = '<tr><th class="col-id">No ID</th>';
        headers.forEach(function(header) {
            let headerTitle = header.replace(/_/g, ' ').toUpperCase();
            headerHtml += `<th>${headerTitle}</th>`;
        });
        headerHtml += '</tr>';
        tableHead.innerHTML = headerHtml;
    }
}

export function loadMoreData() {
    const tableBody = document.getElementById('tableBody');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    if (currentIndex >= filteredData.length) return;
    
    if (progressContainer) {
        progressContainer.style.display = "block";
        progressBar.style.width = "100%";
        progressText.innerText = "Memuat data...";
    }

    let endIndex = currentIndex + batchSize;
    if (endIndex > filteredData.length) {
        endIndex = filteredData.length;
    }

    let rowsHtml = "";
    for (let i = currentIndex; i < endIndex; i++) {
        let row = filteredData[i];
        let rowClass = "";

        if (row['keterangan'] && row['keterangan'].toLowerCase() === 'selesai') {
            rowClass = "row-hijau"; 
        }
        
        rowsHtml += `<tr class="${rowClass}">`;
        rowsHtml += `<td class="col-id" style="text-align: center;"><b>${i + 1}</b></td>`;
        
        headers.forEach(function(header) {
            rowsHtml += `<td>${row[header] !== undefined ? row[header] : ''}</td>`;
        });
        
        rowsHtml += '</tr>';
    }

    tableBody.insertAdjacentHTML('beforeend', rowsHtml);
    currentIndex = endIndex;
    
    if (progressContainer) {
        progressContainer.style.display = "none";
    }
}

export async function fetchPaginatedData() {
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const searchCategory = document.getElementById('searchCategory');
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('tableBody');
    const filterSummary = document.getElementById('filterSummary');
    const countFiltered = document.getElementById('countFiltered');

    if (isPulling || !hasMorePullData) return;
    
    isPulling = true;
    if (progressContainer) {
        progressContainer.style.display = "block";
        progressBar.style.width = "100%";
        progressText.innerText = "Memuat data...";
    }
    
    try {
        const limit = 50;
        const from = (currentPullPage - 1) * limit;
        const to = from + limit - 1;
        
        let query = supabaseClient.from(TABLE_NAME).select('*', { count: currentPullPage === 1 ? 'exact' : undefined }).order('id', { ascending: true }).range(from, to);
        
        const searchTerm = searchInput ? searchInput.value.trim() : "";
        if (searchTerm !== "") {
            const selectedCategory = searchCategory.value;
            if (selectedCategory === 'all') {
                const sanitizedTerm = searchTerm.replace(/[(),]/g, '');
                const orFilter = DB_COLUMNS.map(col => `${col}.ilike.*${sanitizedTerm}*`).join(',');
                query = query.or(orFilter);
            } else {
                query = query.ilike(selectedCategory, `%${searchTerm}%`);
            }
        }
        
        const { data, error, count } = await query;
        if (error) throw error;
        
        if (currentPullPage === 1) {
            if (searchTerm !== "") {
                if (filterSummary) filterSummary.style.display = "inline";
                if (countFiltered) countFiltered.innerText = count !== null ? count : 0;
            } else {
                if (filterSummary) filterSummary.style.display = "none";
            }
        }

        if (data && data.length > 0) {
            setupHeadersIfNeeded();
            allData.push(...data);
            filteredData = [...allData];
            loadMoreData();
            
            if (data.length < limit) hasMorePullData = false;
            else currentPullPage++;
        } else {
            hasMorePullData = false;
            if (currentPullPage === 1) {
                if (searchTerm !== "" && countFiltered) countFiltered.innerText = "0";
                tableBody.innerHTML = "<tr><td colspan='100%' style='text-align:center; padding: 15px;'>Data tidak ditemukan</td></tr>";
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        isPulling = false;
        if (progressContainer) progressContainer.style.display = "none";
    }
}

export function resetPagination() {
    currentPullPage = 1;
    hasMorePullData = true;
    allData = [];
    filteredData = [];
    currentIndex = 0;
    const tableBody = document.getElementById('tableBody');
    if (tableBody) tableBody.innerHTML = "";
    
    const searchInput = document.getElementById('searchInput');
    const filterSummary = document.getElementById('filterSummary');
    const countFiltered = document.getElementById('countFiltered');
    if (searchInput && searchInput.value.trim() === "") {
        if (filterSummary) filterSummary.style.display = "none";
    } else if (countFiltered) {
        countFiltered.innerText = "0";
    }
}

export async function fetchAllDataConcurrently() {
    const limit = 1000;
    const { count, error: countError } = await supabaseClient.from(TABLE_NAME).select('*', { count: 'exact', head: true });
    if (countError) { alert("Gagal menghitung total data: " + countError.message); return null; }
    if (count === 0) return [];

    const totalPages = Math.ceil(count / limit);
    const maxConcurrent = 5;
    const pagedData = new Array(totalPages);
    let currentPage = 0;
    let completedPages = 0;

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressContainer) {
        progressContainer.style.display = "block";
        progressBar.style.width = "0%";
        progressText.innerText = `Menarik 0 / ${totalPages} halaman data... (0%)`;
    }

    const selectQuery = 'id,' + DB_COLUMNS.join(',');

    const fetchWorker = async () => {
        while (currentPage < totalPages) {
            const page = currentPage++; 
            const from = page * limit;
            const to = from + limit - 1;
            const { data, error } = await supabaseClient.from(TABLE_NAME).select(selectQuery).order('id', { ascending: true }).range(from, to);
            if (error) throw error;
            pagedData[page] = data; 
            completedPages++;

            if (progressContainer) {
                const percent = Math.round((completedPages / totalPages) * 100);
                progressBar.style.width = `${percent}%`;
                progressText.innerText = `Menarik ${completedPages} / ${totalPages} halaman data... (${percent}%)`;
            }
        }
    };

    const workers = Array.from({ length: Math.min(maxConcurrent, totalPages) }, () => fetchWorker());
    try { 
        await Promise.all(workers); 
    } catch (error) { 
        if (progressContainer) progressContainer.style.display = "none";
        alert("Gagal mengekspor data: " + error.message); 
        return null; 
    }

    if (progressContainer) {
        setTimeout(() => {
            progressContainer.style.display = "none";
        }, 1000);
    }
    
    return pagedData.flat();
}

export function initTableScroll() {
    const scrollWrapper = document.getElementById('tableScrollWrapper');
    scrollWrapper.addEventListener('scroll', function() {
        if (scrollWrapper.scrollTop + scrollWrapper.clientHeight >= scrollWrapper.scrollHeight - 5) {
            if (currentIndex < filteredData.length) {
                loadMoreData();
            } else {
                fetchPaginatedData();
            }
        }
    });
}

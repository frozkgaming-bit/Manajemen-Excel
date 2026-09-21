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

export function getHeaders() { return headers; }
export function getAllData() { return allData; }
export function setSearchTerm(val) { currentSearchTerm = val; }
export function getSearchTerm() { return currentSearchTerm; }

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
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (currentIndex >= filteredData.length) return;
    loadingIndicator.style.display = "block";

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
    loadingIndicator.style.display = "none";
}

export async function fetchPaginatedData() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const searchCategory = document.getElementById('searchCategory');
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('tableBody');

    if (isPulling || !hasMorePullData) return;
    
    isPulling = true;
    loadingIndicator.style.display = "block";
    
    try {
        const limit = 50;
        const from = (currentPullPage - 1) * 50;
        const to = from + 49;
        
        const selectQuery = 'id,' + DB_COLUMNS.join(',');
        
        let query = supabaseClient
            .from(TABLE_NAME)
            .select(selectQuery, { count: 'exact' })
            .order('id', { ascending: true })
            .range(from, to);
        
        const searchTerm = searchInput ? searchInput.value.trim() : "";
        
        if (searchTerm) {
            const selectedCategory = document.getElementById('searchCategory')?.value || 'all';
            
            if (selectedCategory === 'all') {
                // Safe PostgREST or() format: use .ilike.*term* syntax
                const orConditions = DB_COLUMNS.map(col => `${col}.ilike.*${searchTerm}*`).join(',');
                query = query.or(orConditions);
            } else {
                query = query.ilike(selectedCategory, `%${searchTerm}%`);
            }
        }
        
        const { data, error, count } = await query;
        if (error) throw error;
        
        if (data && data.length > 0) {
            setupHeadersIfNeeded();
            
            // Always push to filteredData for rendering
            filteredData.push(...data);
            
            loadMoreData();
            
            // Update filtered count from server
            const filterSummary = document.getElementById('filterSummary');
            const countFiltered = document.getElementById('countFiltered');
            if (countFiltered && count !== undefined) {
                countFiltered.innerText = count;
                if (filterSummary) filterSummary.style.display = 'inline-block';
            }
            
            if (data.length < 50) hasMorePullData = false;
            else currentPullPage++;
        } else {
            hasMorePullData = false;
            if (currentPullPage === 1) {
                document.getElementById('tableBody').innerHTML = "<tr><td colspan='100%' style='text-align:center;'>Data tidak ditemukan</td></tr>";
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        isPulling = false;
        document.getElementById('loadingIndicator').style.display = "none";
    }
}

export function resetPagination() {
    currentPullPage = 1;
    hasMorePullData = true;
    filteredData.length = 0;
    currentIndex = 0;
    document.getElementById('tableBody').innerHTML = "";
    
    // Reset filtered count display
    const filterSummary = document.getElementById('filterSummary');
    const countFiltered = document.getElementById('countFiltered');
    if (filterSummary) filterSummary.style.display = 'none';
    if (countFiltered) countFiltered.innerText = 0;
}

export function appendData(newData) {
    allData.push(...newData);
    filteredData = allData;
}

export async function fetchAllDataConcurrently() {
    const limit = 1000;

    const { count, error: countError } = await supabaseClient
        .from(TABLE_NAME)
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("Gagal menghitung data", countError);
        alert("Gagal menghitung total data: " + countError.message);
        return null;
    }
    
    if (count === 0) return [];

    const totalPages = Math.ceil(count / limit);
    const maxConcurrent = 5;
    const pagedData = new Array(totalPages);
    let currentPage = 0;

    const selectQuery = 'id,' + DB_COLUMNS.join(',');

    const fetchWorker = async () => {
        while (currentPage < totalPages) {
            const page = currentPage++; 
            const from = page * limit;
            const to = from + limit - 1;

            const { data, error } = await supabaseClient
                .from(TABLE_NAME)
                .select(selectQuery)
                .order('id', { ascending: true })
                .range(from, to);

            if (error) throw error;
            pagedData[page] = data; 
        }
    };

    const workers = Array.from(
        { length: Math.min(maxConcurrent, totalPages) }, 
        () => fetchWorker()
    );

    try {
        await Promise.all(workers);
    } catch (error) {
        console.error("Terjadi kegagalan penarikan data paralel:", error);
        alert("Gagal mengekspor data: " + error.message);
        return null;
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

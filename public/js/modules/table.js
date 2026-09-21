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
    const filterSummary = document.getElementById('filterSummary');
    const countFiltered = document.getElementById('countFiltered');

    if (isPulling || !hasMorePullData) return;
    
    isPulling = true;
    loadingIndicator.style.display = "block";

    try {
        const limit = 50;
        const from = (currentPullPage - 1) * limit;
        const to = from + limit - 1;

        const selectQuery = 'id,' + DB_COLUMNS.join(',');
        currentSearchTerm = searchInput ? searchInput.value.trim() : "";

        // Sertakan count: 'exact' pada penarikan halaman pertama
        let query = supabaseClient
            .from(TABLE_NAME)
            .select(selectQuery, { count: currentPullPage === 1 ? 'exact' : undefined })
            .order('id', { ascending: true })
            .range(from, to);

        if (currentSearchTerm !== "") {
            const selectedCategory = searchCategory ? searchCategory.value : 'all';

            if (selectedCategory === 'all') {
                const sanitizedTerm = currentSearchTerm.replace(/[(),]/g, '');
                const orFilter = DB_COLUMNS.map(col => `${col}.ilike.*${sanitizedTerm}*`).join(',');
                query = query.or(orFilter);
            } else {
                query = query.ilike(selectedCategory, `%${currentSearchTerm}%`);
            }
        }

        const { data, error, count } = await query;
        if (error) throw error;

        // Tampilkan info "Ditemukan: N" jika user sedang mencari kata kunci
        if (currentPullPage === 1) {
            if (currentSearchTerm !== "") {
                if (filterSummary) filterSummary.style.display = "inline";
                if (countFiltered) countFiltered.innerText = count !== null && count !== undefined ? count : 0;
            } else {
                // Sembunyikan jika pencarian kosong (menampilkan data normal)
                if (filterSummary) filterSummary.style.display = "none";
            }
        }

        if (data && data.length > 0) {
            setupHeadersIfNeeded();
            
            filteredData.push(...data);
            loadMoreData();

            if (data.length < limit) {
                hasMorePullData = false;
            } else {
                currentPullPage++;
            }
        } else {
            hasMorePullData = false;
            if (currentPullPage === 1) {
                // Pastikan angka tetap 0 jika data kosong
                if (currentSearchTerm !== "" && countFiltered) {
                    countFiltered.innerText = "0";
                }
                tableBody.innerHTML = "<tr><td colspan='100%' style='text-align:center; padding: 15px;'>Data tidak ditemukan</td></tr>";
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        isPulling = false;
        loadingIndicator.style.display = "none";
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
    
    // Jangan langsung sembunyikan jika searchInput masih memiliki teks pencarian
    const searchInput = document.getElementById('searchInput');
    const filterSummary = document.getElementById('filterSummary');
    const countFiltered = document.getElementById('countFiltered');

    if (searchInput && searchInput.value.trim() === "") {
        if (filterSummary) filterSummary.style.display = "none";
    } else {
        if (countFiltered) countFiltered.innerText = "0";
    }
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

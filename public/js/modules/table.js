import { supabaseClient, TABLE_NAME, DB_COLUMNS } from '../config/supabase.js';
import { showProgress, updateProgress, hideProgress } from './progress.js';

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
    if (headers.length === 0) {
        headers = [...DB_COLUMNS];
    }
    const tableHead = document.getElementById('tableHead');
    if (tableHead) {
        let headerHtml = '<tr><th class="py-3 px-3 text-center w-14" scope="col">No ID</th>';
        headers.forEach(function(header) {
            let headerTitle = header.replace(/_/g, ' ').toUpperCase();
            headerHtml += `<th class="py-3 px-4">${headerTitle}</th>`;
        });
        headerHtml += '<th class="py-3 px-3 text-center w-12" scope="col">✓</th>';
        headerHtml += '</tr>';
        tableHead.innerHTML = headerHtml;
    }
}

export function loadMoreData() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    
    if (currentIndex >= filteredData.length) return;
    
    let endIndex = currentIndex + batchSize;
    if (endIndex > filteredData.length) {
        endIndex = filteredData.length;
    }

    let rowsHtml = "";
    for (let i = currentIndex; i < endIndex; i++) {
        let row = filteredData[i];
        let rowClass = "";

        if (row['keterangan'] && row['keterangan'].toLowerCase() === 'selesai') {
            rowClass = "bg-emerald-50 text-emerald-700";
        }
        
        rowsHtml += `<tr class="group hover:bg-slate-50/80 transition-colors ${rowClass}">`;
        rowsHtml += `<td class="py-3 px-3 text-center font-semibold text-slate-900">${i + 1}</td>`;
        
        headers.forEach(function(header) {
            let cellValue = row[header] !== undefined && row[header] !== null ? row[header] : '';
            let cellClass = '';
            if (header === 'keterangan') {
                if (cellValue.toLowerCase() === 'selesai') {
                    cellClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100';
                } else if (cellValue.toLowerCase() === 'belum selesai') {
                    cellClass = 'bg-rose-50 text-rose-700 border-rose-200 group-hover:bg-rose-100';
                } else {
                    cellClass = 'bg-slate-100 text-slate-600 group-hover:bg-slate-200';
                }
                cellValue = cellValue.charAt(0).toUpperCase() + cellValue.slice(1).toLowerCase();
            }
            rowsHtml += `<td class="py-3 px-4 ${cellClass}">${cellValue}</td>`;
        });

        const isChecked = row['keterangan'] && row['keterangan'].toLowerCase() === 'selesai';
        const rowId = row['id'];
        rowsHtml += `<td class="py-3 px-3 text-center"><input type="checkbox" class="keterangan-toggle w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" data-id="${rowId}" ${isChecked ? 'checked' : ''}></td>`;
        
        rowsHtml += '</tr>';
    }

    if (tableBody) {
        tableBody.insertAdjacentHTML('beforeend', rowsHtml);
    }
    currentIndex = endIndex;
}

export async function fetchPaginatedData() {
    const tableBody = document.getElementById('tableBody');
    const searchCategory = document.getElementById('searchCategory');
    const searchInput = document.getElementById('searchInput');
    const filterSummary = document.getElementById('filterSummary');
    const countFiltered = document.getElementById('countFiltered');
    const searchDisplay = document.getElementById('searchDisplay');
    const pageStart = document.getElementById('pageStart');
    const pageEnd = document.getElementById('pageEnd');
    const totalRecords = document.getElementById('totalRecords');

    if (isPulling || !hasMorePullData) return;
    
    isPulling = true;
    
    try {
        const limit = 50;
        const from = (currentPullPage - 1) * 50;
        const to = from + 50 - 1;
        
        let query = supabaseClient.from(TABLE_NAME).select('*', { count: currentPullPage === 1 ? 'exact' : undefined }).order('id', { ascending: true }).range(from, to);
        
        const searchTerm = document.getElementById('searchInput')?.value?.trim() || "";
        
        if (searchTerm !== "") {
            const selectedCategory = document.getElementById('searchCategory')?.value || 'all';
            
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
                const filterSummary = document.getElementById('filterSummary');
                const countFiltered = document.getElementById('countFiltered');
                if (filterSummary) filterSummary.style.display = "inline";
                if (countFiltered) countFiltered.innerText = count !== null && count !== undefined ? count : 0;
                if (searchDisplay) searchDisplay.textContent = searchTerm;
            } else {
                const filterSummary = document.getElementById('filterSummary');
                if (filterSummary) filterSummary.style.display = "none";
                if (searchDisplay) searchDisplay.textContent = '-';
            }
        }

        if (data && data.length > 0) {
            setupHeadersIfNeeded();
            allData.push(...data);
            filteredData = [...allData];
            loadMoreData();
            
            // Update pagination info
            if (pageStart) pageStart.textContent = currentIndex - data.length + 1;
            if (pageEnd) pageEnd.textContent = currentIndex;
            if (totalRecords) totalRecords.textContent = count || filteredData.length;
            
            if (data.length < 50) hasMorePullData = false;
            else currentPullPage++;
        } else {
            hasMorePullData = false;
            if (currentPullPage === 1) {
                const tableBody = document.getElementById('tableBody');
                if (tableBody) {
                    tableBody.innerHTML = `<tr><td colspan="${headers.length + 2}" class="py-12 text-center text-slate-500">Data tidak ditemukan</td></tr>`;
                }
                if (searchTerm !== "") {
                    const countFiltered = document.getElementById('countFiltered');
                    if (countFiltered) countFiltered.innerText = "0";
                }
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        isPulling = false;
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
    
    // Reset filtered count display
    const filterSummary = document.getElementById('filterSummary');
    const countFiltered = document.getElementById('countFiltered');
    if (filterSummary) filterSummary.style.display = "none";
    if (countFiltered) countFiltered.innerText = 0;
}

export async function fetchAllDataConcurrently() {
    const { count, error: countError } = await supabaseClient.from(TABLE_NAME).select('*', { count: 'exact', head: true });
    if (countError) { alert("Gagal menghitung total data: " + countError.message); return null; }
    if (count === 0) return [];

    const totalPages = Math.ceil(count / 1000);
    const pagedData = new Array(totalPages);
    let completedPages = 0;
    let currentPage = 0;

    const selectQuery = 'id,' + DB_COLUMNS.join(',');

    const fetchWorker = async () => {
        while (currentPage < totalPages) {
            const page = currentPage++;
            const from = page * 1000;
            const to = from + 1000 - 1;
            const { data, error } = await supabaseClient.from(TABLE_NAME).select(selectQuery).order('id', { ascending: true }).range(from, to);
            if (error) throw error;
            pagedData[page] = data;
            completedPages++;
            const percent = Math.round((completedPages / totalPages) * 80);
            updateProgress(percent, `Mengambil data: ${completedPages}/${totalPages} halaman (${count.toLocaleString('id-ID')} total baris)`);
        }
    };

    const workers = Array.from({ length: Math.min(5, totalPages) }, () => fetchWorker());
    try { await Promise.all(workers); } catch (error) { alert("Gagal mengekspor data: " + error.message); return null; }
    return pagedData.flat();
}

export function initTableScroll() {
    const scrollWrapper = document.querySelector('.overflow-x-auto');
    if (scrollWrapper) {
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
}

export function initKeteranganHandlers() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    tableBody.addEventListener('click', async (e) => {
        const checkbox = e.target.closest('.keterangan-toggle');
        if (!checkbox) return;

        const rowId = parseInt(checkbox.dataset.id);
        if (!rowId) return;

        const newStatus = checkbox.checked ? 'Selesai' : 'Belum Selesai';
        checkbox.disabled = true;

        try {
            const { error } = await supabaseClient
                .from(TABLE_NAME)
                .update({ keterangan: newStatus })
                .eq('id', rowId);

            if (error) throw error;

            const row = allData.find(r => r.id === rowId);
            if (row) row.keterangan = newStatus;
            const fRow = filteredData.find(r => r.id === rowId);
            if (fRow) fRow.keterangan = newStatus;

            const tr = checkbox.closest('tr');
            const tds = tr.querySelectorAll('td');
            const keteranganTd = tds[headers.length];
            if (keteranganTd) {
                const displayVal = newStatus.charAt(0).toUpperCase() + newStatus.slice(1).toLowerCase();
                keteranganTd.textContent = displayVal;
                keteranganTd.className = 'py-3 px-4 ' + (newStatus === 'Selesai'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 border-rose-200 group-hover:bg-rose-100');
            }

            if (newStatus === 'Selesai') {
                tr.classList.add('bg-emerald-50', 'text-emerald-700');
            } else {
                tr.classList.remove('bg-emerald-50', 'text-emerald-700');
            }

            const { fetchServerCounts } = await import('./stats.js');
            fetchServerCounts();
        } catch (err) {
            console.error('Gagal update keterangan:', err);
            checkbox.checked = !checkbox.checked;
            alert('Gagal memperbarui status: ' + err.message);
        } finally {
            checkbox.disabled = false;
        }
    });
}
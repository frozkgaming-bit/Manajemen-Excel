import { supabaseClient, TABLE_NAME, DB_COLUMNS } from '../config/supabase.js';
import { showProgress, updateProgress, hideProgress } from '../modules/progress.js';
import { setupHeadersIfNeeded, loadMoreData, fetchAllDataConcurrently, getHeaders, getAllData, setAllData, setFilteredData, setCurrentIndex, resetPagination, fetchPaginatedData, initTableScroll } from '../modules/table.js';
import { sendToBackendInChunks, initExcelHandlers, cleanSuratUkur } from '../modules/excel.js';
import { fetchServerCounts } from '../modules/stats.js';
import { initSearch } from '../modules/search.js';
import { initStorageHandlers, loadFileList, uploadDwgFile, listDwgFiles, getPublicUrl } from '../modules/storage.js';
import { showProgress, updateProgress, hideProgress } from '../modules/progress.js';

export default function Dashboard() {
    return `
        <!-- Dashboard Data EXCEL BOS EDS (Redesigned) -->
        <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="dashboardContent">
            <!-- BEGIN: DataManagementCards -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <!-- Excel Import & Sync Card -->
                <div class="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h2 class="text-sm font-bold text-slate-900 flex items-center">
                                <svg class="w-4 h-4 mr-2 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                                </svg>
                                Sinkronisasi & Impor Data Excel
                            </h2>
                        <span class="text-[11px] font-medium text-slate-400">Format: .xlsx, .xls</span>
                        </div>
                        <div class="mt-4 space-y-3.5"><!-- Row: Basis Data Utama -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                <label class="font-medium text-slate-700 min-w-44">Upload Basis Data Utama:</label>
                                <div class="flex items-center w-full max-w-md bg-slate-50 border border-slate-200 rounded-lg p-1 focus-within:border-brand-500">
                                    <label class="cursor-pointer bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-medium hover:bg-slate-100 transition shadow-2xs shrink-0">
                                        <span class="">Choose File</span>
                                        <input class="hidden" type="file" id="fileUploadMain" accept=".xlsx, .xls, .csv" />
                                    </label>
                                    <span class="ml-3 text-slate-600 text-xs truncate font-medium" id="mainFileName">No file chosen</span>
                                </div>
                            </div>
                            <!-- Row: Data Selesai -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                                <label class="font-medium text-slate-700 min-w-44">Upload Data Selesai <span class="text-slate-400">(Otomatis "Selesai")</span>:</label>
                                <div class="flex items-center w-full max-w-md bg-slate-50 border border-slate-200 rounded-lg p-1">
                                    <label class="cursor-pointer bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-medium hover:bg-slate-100 transition shadow-2xs shrink-0">
                                        <span class="">Choose File</span>
                                        <input class="hidden" type="file" id="fileUploadDone" accept=".xlsx, .xls, .csv" />
                                    </label>
                                    <span class="ml-3 text-slate-400 text-xs truncate" id="doneFileName">No file chosen</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Sync Actions -->
                    <div class="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-2.5">
                        <button id="btnPullData" class="inline-flex items-center px-3.5 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-hidden transition shadow-xs" type="button">
                            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                            </svg>
                            Tarik Seluruh Data Dari Database
                        </button>
                        <button id="btnPrint" class="inline-flex items-center px-3.5 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-hidden transition shadow-xs" type="button">
                            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                            </svg>
                            Export ke Excel
                        </button>
                    </div>
                </div>
            </div>
            <!-- AutoCAD (.dwg) Integration Card -->
            <div class="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between">
                <div>
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h2 class="text-sm font-bold text-slate-900 flex items-center">
                            <svg class="w-4 h-4 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                            </svg>
                            Upload File AutoCAD (.dwg)
                        </h2>
                        <span class="text-[11px] font-medium text-slate-400">Peta Kadastral</span>
                    </div>
                    <div class="mt-4 space-y-3">
                        <div class="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                            <label class="cursor-pointer bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-medium hover:bg-slate-100 transition shadow-2xs shrink-0">
                                <span class="">Choose File</span>
                                <input class="hidden" type="file" id="dwgFileInput" accept=".dwg" />
                            </label>
                            <span class="ml-3 text-slate-500 text-xs truncate" id="dwgFileName">No file chosen</span>
                        </div>
                    </div>
                </div>
                <div class="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <button id="uploadBtn" class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-hidden transition shadow-xs" type="button">
                        <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                        </svg>
                        Unggah ke Database
                    </button>
                </div>
            </div>
        </div>
        <!-- END: DataManagementCards -->
        
        <!-- BEGIN: SearchAndMetrics -->
        <div class="space-y-4">
            <!-- Search and Filter Bar -->
            <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
                <div class="w-full md:w-56 shrink-0">
                    <label class="sr-only">Kategori Filter</label>
                    <select id="searchCategory" class="w-full rounded-lg border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-brand-500 py-2">
                        <option selected="" value="all">Semua Kategori</option>
                        <option value="kelurahan">KELURAHAN</option>
                        <option value="nomor_hak">NOMOR HAK</option>
                        <option value="surat_ukur">SURAT UKUR</option>
                        <option value="nib">NIB</option>
                    </select>
                </div>
                <div class="relative w-full flex items-center">
                    <input id="searchInput" class="w-full rounded-lg border-slate-200 text-xs text-slate-900 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-brand-500 pr-10 py-2" placeholder="Cari data berdasarkan filter terpilih..." type="text" autocomplete="off">
                    <button id="btnSearch" class="absolute right-1 top-1 bottom-1 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-md flex items-center justify-center transition" type="button">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- KPI Summary Status Pill Badges -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <!-- Total Data Metric -->
                <div class="bg-white border border-slate-200/80 rounded-lg p-3 flex items-center justify-between shadow-2xs">
                    <div>
                        <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Data</p>
                        <p class="text-lg font-bold text-brand-600" id="countTotal">0</p>
                    </div>
                    <span class="w-9 h-9 rounded-lg bg-blue-50 text-brand-600 flex items-center justify-center font-semibold text-xs">
                        ALL
                    </span>
                </div>
                <!-- Selesai Metric -->
                <div class="bg-white border border-slate-200/80 rounded-lg p-3 flex items-center justify-between shadow-2xs">
                    <div>
                        <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Selesai</p>
                        <p class="text-lg font-bold text-emerald-600" id="countSelesai">0</p>
                    </div>
                    <span class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold text-xs">
                        ✓
                    </span>
                </div>
                <!-- Belum Selesai Metric -->
                <div class="bg-white border border-slate-200/80 rounded-lg p-3 flex items-center justify-between shadow-2xs">
                    <div>
                        <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Belum Selesai</p>
                        <p class="text-lg font-bold text-rose-600" id="countBelum">0</p>
                    </div>
                    <span class="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-semibold text-xs">
                        !
                    </span>
                </div>
                <!-- Ditemukan Metric -->
                <div class="bg-white border border-slate-200/80 rounded-lg p-3 flex items-center justify-between shadow-2xs">
                    <div>
                        <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Ditemukan</p>
                        <p class="text-lg font-bold text-amber-600" id="countFiltered">0</p>
                    </div>
                    <span class="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-semibold text-xs">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                        </svg>
                    </span>
                </div>
            </div>
            </div>
            <!-- END: SearchAndMetrics -->
            
            <!-- BEGIN: DataTableSection -->
            <div class="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
                <!-- Table Header & Controls -->
                <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Daftar Data Pertanahan Terverifikasi</h3>
                    <span class="text-[11px] text-slate-500">Menampilkan hasil untuk: <span class="font-semibold text-slate-800" id="searchDisplay">-</span></span>
                </div>
                <!-- Responsive Table Container -->
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-slate-600 border-collapse" id="dataTable">
                        <thead class="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                            <tr>
                                <th class="py-3 px-3 text-center w-14" scope="col">No ID</th>
                                <th class="py-3 px-4" scope="col">Kelurahan</th>
                                <th class="py-3 px-4" scope="col">Nomor Hak</th>
                                <th class="py-3 px-4" scope="col">Surat Ukur</th>
                                <th class="py-3 px-3" scope="col">NIB</th>
                                <th class="py-3 px-3 text-right" scope="col">Luas</th>
                                <th class="py-3 px-3 text-center" scope="col">Produk</th>
                                <th class="py-3 px-3 text-right" scope="col">Luas Peta</th>
                                <th class="py-3 px-3 text-center" scope="col">Validator Tekstual</th>
                                <th class="py-3 px-3 text-center" scope="col">Validator Yuridis</th>
                                <th class="py-3 px-3 text-center" scope="col">Status</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody" class="divide-y divide-slate-100">
                        </tbody>
                    </table>
                </div>
                <!-- Pagination Footer -->
                <div class="px-5 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div class="">
                        Menampilkan <span class="font-semibold text-slate-800" id="pageStart">0</span> sampai <span class="font-semibold text-slate-800" id="pageEnd">0</span> dari <span class="font-semibold text-slate-800" id="totalRecords">0</span> data
                    </div>
                    <div class="inline-flex items-center space-x-1" id="paginationControls">
                    </div>
                </div>
            </div>
            <!-- END: DataTableSection -->
        </main>
    `;
}

export function initDashboardPage() {
    // Initialize all dashboard modules
    import('../modules/table.js').then(module => {
        module.initTableScroll();
    });
    
    import('../modules/search.js').then(module => {
        module.initSearch();
    });
    
    import('../modules/excel.js').then(module => {
        module.initExcelHandlers();
    });
    
    import('../modules/storageHandler.js').then(module => {
        module.initStorageHandlers();
    });
    
    import('../modules/table.js').then(module => {
        module.initTableScroll();
    });
    
    // Initialize pull data button
    const btnPullData = document.getElementById('btnPullData');
    if (btnPullData) {
        btnPullData.addEventListener('click', async () => {
            const { resetPagination, fetchPaginatedData, fetchServerCounts } = await import('../modules/table.js');
            const { fetchServerCounts: fetchCounts } = await import('../modules/stats.js');
            
            resetPagination();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = "";
            
            fetchServerCounts();
            await fetchPaginatedData();
        });
    }
    
    // Initialize storage handlers
    import('../modules/storageHandler.js').then(module => {
        module.initStorageHandlers();
    });
    
    import('../modules/search.js').then(module => {
        module.initSearch();
    });
    
    import('../modules/excel.js').then(module => {
        module.initExcelHandlers();
    });
    
    import('../modules/table.js').then(module => {
        module.initTableScroll();
    });
    
    import('../modules/stats.js').then(module => {
        module.fetchServerCounts();
    });
}

export function initDashboardPageScript() {
    // Initialize all modules when dashboard is loaded
    console.log('Dashboard initialized');
}
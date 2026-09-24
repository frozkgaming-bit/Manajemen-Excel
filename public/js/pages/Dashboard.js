import { supabaseClient, TABLE_NAME, DB_COLUMNS } from '../config/supabase.js';
import { showProgress, updateProgress, hideProgress } from '../modules/progress.js';
import { fetchPaginatedData, initTableScroll, initKeteranganHandlers, resetPagination } from '../modules/table.js';
import { initExcelHandlers } from '../modules/excel.js';
import { fetchServerCounts } from '../modules/stats.js';
import { initSearch } from '../modules/search.js';
import { initStorageHandlers } from '../modules/storageHandler.js';
import Navbar, { initNavbar } from '../components/Navbar.js';

const render = () => {
    return `
        <!-- Dashboard Data EXCEL BOS EDS (Redesigned) -->
        <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" id="dashboardContent">
            <!-- BEGIN: DataManagementCards -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <!-- Excel Import Card -->
                <div class="lg:col-span-6 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h2 class="text-sm font-bold text-slate-900 flex items-center">
                                <svg class="w-4 h-4 mr-2 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                                </svg>
                                Upload File Excel
                            </h2>
                            <span class="text-[11px] font-medium text-slate-400">Format: .xlsx, .xls</span>
                        </div>
                        <div class="mt-4">
                            <div class="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                                <label class="cursor-pointer bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-medium hover:bg-slate-100 transition shadow-2xs shrink-0">
                                    <span class="">Pilih File</span>
                                    <input class="hidden" type="file" id="fileUploadExcel" accept=".xlsx, .xls, .csv" />
                                </label>
                                <span class="ml-3 text-slate-500 text-xs truncate" id="excelFileName">No file chosen</span>
                            </div>
                            <div id="excelUploadToast" class="hidden mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"></div>
                        </div>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2.5">
                        <button id="btnUploadExcel" class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-hidden transition shadow-xs" type="button">
                            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                            </svg>
                            Upload ke Database
                        </button>
                        <button id="btnPrint" class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-hidden transition shadow-xs" type="button">
                            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                            </svg>
                            Export ke Excel
                        </button>
                    </div>
                </div>
                <!-- DWG Upload Card -->
                <div class="lg:col-span-6 bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h2 class="text-sm font-bold text-slate-900 flex items-center">
                                <svg class="w-4 h-4 mr-2 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                                </svg>
                                Upload File DWG
                            </h2>
                            <span class="text-[11px] font-medium text-slate-400">Format: .dwg</span>
                        </div>
                        <div class="mt-4">
                            <div class="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1.5">
                                <label class="cursor-pointer bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-xs font-medium hover:bg-slate-100 transition shadow-2xs shrink-0">
                                    <span class="">Pilih File</span>
                                    <input class="hidden" type="file" id="dwgFileInput" accept=".dwg" />
                                </label>
                                <span class="ml-3 text-slate-500 text-xs truncate" id="dwgFileName">No file chosen</span>
                            </div>
                            <div id="dwgUploadToast" class="hidden mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"></div>
                        </div>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2.5">
                        <button id="uploadBtn" class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:outline-hidden transition shadow-xs" type="button">
                            <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                            </svg>
                            Upload ke Database
                        </button>
                    </div>
                </div>
            </div>
            <!-- END: DataManagementCards -->
            
            <!-- BEGIN: SearchAndMetrics -->
            <div class="space-y-4">
                <div class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
                    <div class="w-full md:w-56 shrink-0">
                        <label class="sr-only">Kategori Filter</label>
                        <select id="searchCategory" class="w-full rounded-lg border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-brand-500 py-2">
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
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="bg-white border border-slate-200/80 rounded-lg p-3 flex items-center justify-between shadow-2xs">
                        <div>
                            <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Data</p>
                            <p class="text-lg font-bold text-brand-600" id="countTotal">0</p>
                        </div>
                        <span class="w-9 h-9 rounded-lg bg-blue-50 text-brand-600 flex items-center justify-center font-semibold text-xs">ALL</span>
                    </div>
                    <div class="bg-white border border-slate-200/80 rounded-lg p-3 flex items-center justify-between shadow-2xs">
                        <div>
                            <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Selesai</p>
                            <p class="text-lg font-bold text-emerald-600" id="countSelesai">0</p>
                        </div>
                        <span class="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-semibold text-xs">✓</span>
                    </div>
                    <div class="bg-white border border-slate-200/80 rounded-lg p-3 flex items-center justify-between shadow-2xs">
                        <div>
                            <p class="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Belum Selesai</p>
                            <p class="text-lg font-bold text-rose-600" id="countBelum">0</p>
                        </div>
                        <span class="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-semibold text-xs">!</span>
                    </div>
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
                <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Daftar Data Pertanahan Terverifikasi</h3>
                    <span class="text-[11px] text-slate-500">Menampilkan hasil untuk: <span class="font-semibold text-slate-800" id="searchDisplay">-</span></span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs text-slate-600 border-collapse" id="dataTable">
                        <thead class="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200" id="tableHead">
                        </thead>
                        <tbody id="tableBody" class="divide-y divide-slate-100">
                        </tbody>
                    </table>
                </div>
                <div class="px-5 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                    <div class="">
                        Menampilkan <span class="font-semibold text-slate-800" id="pageStart">0</span> sampai <span class="font-semibold text-slate-800" id="pageEnd">0</span> dari <span class="font-semibold text-slate-800" id="totalRecords">0</span> data
                    </div>
                    <div class="inline-flex items-center space-x-1" id="paginationControls">
                    </div>
                </div>
                <div id="scrollSentinel" class="h-1"></div>
            </div>
            <!-- END: DataTableSection -->
        </main>
    `;
};

const init = () => {
    const navContainer = document.getElementById('nav-container');
    if (navContainer) {
        navContainer.innerHTML = Navbar();
        initNavbar(async () => {
            await supabaseClient.auth.signOut();
            window.location.hash = '#/login';
        });
    }

    initTableScroll();
    initKeteranganHandlers();
    initSearch();
    initExcelHandlers();
    initStorageHandlers();
    fetchServerCounts();
    resetPagination();
    fetchPaginatedData();
};

export default { render, init };
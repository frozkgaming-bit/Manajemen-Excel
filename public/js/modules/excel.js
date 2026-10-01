import { supabaseClient, TABLE_NAME, DB_COLUMNS } from '../config/supabase.js';
import { fetchServerCounts } from './stats.js';
import { setupHeadersIfNeeded, fetchAllDataConcurrently, getHeaders, resetPagination, fetchPaginatedData } from './table.js';
import { showProgress, updateProgress, hideProgress } from './progress.js';

function cleanSuratUkur(value) {
    const str = toCellString(value);
    if (!str) return "";
    const match = str.match(/^((?:SU|GS)?[.\s]?\d+)\/[^/]+\/(\d{4})$/i);
    if (match) return `${match[1].trim()}/${match[2]}`;
    return str;
}

const ON_CONFLICT_COLUMNS = DB_COLUMNS.filter(c => c !== 'keterangan').join(',');
const DATA_COLUMNS = DB_COLUMNS.filter(c => c !== 'keterangan');

// Semua kolom DB bertipe string — seluruh nilai Excel dipaksa jadi string
// sebelum signature/upsert, supaya angka di Excel ("238") identik dengan
// teks di DB ("238") dan ON CONFLICT bisa match.
function toCellString(value) {
    if (value === undefined || value === null) return '';
    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(value).trim();
}

function normalizeHeader(header) {
    return toCellString(header)
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
}

function buildSignature(row, cols) {
    return cols.map(col => toCellString(row[col])).join('__');
}

function normalizeExcelRow(row) {
    const normalizedRow = {};

    Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = normalizeHeader(key);
        if (DB_COLUMNS.includes(normalizedKey)) {
            normalizedRow[normalizedKey] = toCellString(value);
        }
    });

    DB_COLUMNS.forEach(col => {
        if (normalizedRow[col] === undefined) normalizedRow[col] = '';
    });

    if (!normalizedRow.keterangan) normalizedRow.keterangan = 'Belum Selesai';
    return normalizedRow;
}

function validateExcelHeaders(rawHeaders) {
    const excelHeaders = new Set(rawHeaders.map(h => normalizeHeader(h)));
    const missing = DATA_COLUMNS.filter(c => !excelHeaders.has(c));
    const matched = DATA_COLUMNS.length - missing.length;

    if (matched === 0) {
        return { ok: false, missing, message: 'Tidak ada kolom Excel yang cocok dengan database. Periksa nama header file.' };
    }

    const identifierCols = ['kelurahan', 'nomor_hak', 'surat_ukur', 'nib'];
    const missingIdentifiers = identifierCols.filter(c => missing.includes(c));
    if (missingIdentifiers.length > 0) {
        return { ok: false, missing, message: `Kolom identifier wajib tidak ditemukan di Excel: ${missingIdentifiers.join(', ')}` };
    }

    if (missing.length > 0) {
        console.warn('Kolom Excel tidak ditemukan (akan diisi kosong):', missing);
    }
    return { ok: true, missing };
}

async function fetchAllSelesaiRows(cols) {
    const selectCols = cols.join(',');
    const pageSize = 1000;
    const all = [];
    let page = 0;

    while (true) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await supabaseClient
            .from(TABLE_NAME)
            .select(selectCols)
            .eq('keterangan', 'Selesai')
            .order('id', { ascending: true })
            .range(from, to);

        if (error) throw new Error(`Gagal mengambil data 'Selesai' dari database: ${error.message}`);
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        page++;
    }
    return all;
}

export async function sendToBackendInChunks(dataArray, chunkSize = 10000) {
    if (!dataArray || dataArray.length === 0) return;

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw new Error(`Gagal memeriksa sesi login: ${sessionError.message}`);
    if (!session) {
        throw new Error('Sesi login sudah berakhir. Silakan login kembali.');
    }

    let successCount = 0;
    const total = dataArray.length;

    showProgress("Mengunggah Data ke Database", 0, `0 / ${total.toLocaleString('id-ID')} baris (0%)`);

    const fileInput = document.getElementById('fileUploadExcel');
    const uploadButton = document.getElementById('btnUploadExcel');
    if (fileInput) fileInput.disabled = true;
    if (uploadButton) uploadButton.disabled = true;

    const totalChunks = Math.ceil(total / chunkSize);
    const errors = [];
    for (let i = 0; i < totalChunks; i++) {
        const from = i * chunkSize;
        const chunk = dataArray.slice(from, from + chunkSize);

        const { error } = await supabaseClient
            .from(TABLE_NAME)
            .upsert(chunk, { onConflict: ON_CONFLICT_COLUMNS });

        if (error) {
            console.error(`Gagal batch ${i + 1}:`, error.message);
            errors.push(`Batch ${i + 1}: ${error.message}`);
            break;
        } else {
            successCount += chunk.length;
        }

        const percent = Math.min(100, Math.round((successCount / total) * 100));
        updateProgress(percent, `Mengunggah: ${successCount.toLocaleString('id-ID')} / ${total.toLocaleString('id-ID')} baris (${percent}%)`);

        await new Promise(r => setTimeout(r, 10));
    }

    if (fileInput) fileInput.disabled = false;
    if (uploadButton) uploadButton.disabled = false;

    if (errors.length > 0) {
        throw new Error(`Gagal mengunggah ${errors.length} batch. ${errors[0]}`);
    }

    updateProgress(100, `Selesai! Berhasil menyimpan ${successCount.toLocaleString('id-ID')} baris.`);
    setTimeout(() => {
        hideProgress();
        const toast = document.getElementById('excelUploadToast');
        if (toast) {
            toast.innerHTML = `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>File berhasil diupload — ${successCount.toLocaleString('id-ID')} baris tersimpan ke database.</span>`;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 10000);
        }
    }, 500);

    fetchServerCounts();
}

export function initExcelHandlers() {
    const fileUploadExcel = document.getElementById('fileUploadExcel');
    const btnPrint = document.getElementById('btnPrint');

    if (fileUploadExcel) {
        fileUploadExcel.addEventListener('change', function(e) {
            var file = e.target.files[0];
            var fileNameEl = document.getElementById('excelFileName');
            var clearBtn = document.getElementById('clearExcelFile');
            if (file) {
                if (fileNameEl) fileNameEl.textContent = file.name;
                if (clearBtn) clearBtn.classList.remove('hidden');
            } else {
                if (fileNameEl) fileNameEl.textContent = 'No file chosen';
                if (clearBtn) clearBtn.classList.add('hidden');
            }
        });
    }

    var clearExcelBtn = document.getElementById('clearExcelFile');
    if (clearExcelBtn) {
        clearExcelBtn.addEventListener('click', function() {
            var fileInput = document.getElementById('fileUploadExcel');
            var fileNameEl = document.getElementById('excelFileName');
            if (fileInput) fileInput.value = '';
            if (fileNameEl) fileNameEl.textContent = 'No file chosen';
            this.classList.add('hidden');
        });
    }

    const btnUploadExcel = document.getElementById('btnUploadExcel');
    if (btnUploadExcel) {
        let isUploading = false;

        function resetUploadState() {
            isUploading = false;
            btnUploadExcel.disabled = false;
        }

        btnUploadExcel.addEventListener('click', function() {
            if (isUploading) return;

            var fileInput = document.getElementById('fileUploadExcel');
            var file = fileInput ? fileInput.files[0] : null;
            if (!file) {
                alert('Pilih file Excel terlebih dahulu.');
                return;
            }

            isUploading = true;
            btnUploadExcel.disabled = true;

            showProgress("Membaca File Excel", 10, "Sedang memproses file, mohon tunggu...");

            setTimeout(() => {
                var reader = new FileReader();

                reader.onerror = function() {
                    hideProgress();
                    alert('Gagal membaca file Excel. Pastikan file tidak rusak.');
                    resetUploadState();
                };

                reader.onload = async function(e) {
                    try {
                        var data = new Uint8Array(e.target.result);
                        var workbook = XLSX.read(data, { type: 'array' });
                        var firstSheetName = workbook.SheetNames[0];
                        var worksheet = workbook.Sheets[firstSheetName];
                        var rawHeaders = (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || []).map(toCellString);
                        var rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                        if (rawData.length === 0) {
                            hideProgress();
                            alert("File kosong.");
                            resetUploadState();
                            return;
                        }

                        const headerCheck = validateExcelHeaders(rawHeaders);
                        if (!headerCheck.ok) {
                            hideProgress();
                            alert(headerCheck.message);
                            resetUploadState();
                            return;
                        }

                        var newData = rawData.map(normalizeExcelRow);
                        newData.forEach(row => {
                            if (row.surat_ukur) row.surat_ukur = cleanSuratUkur(row.surat_ukur);
                        });

                        setupHeadersIfNeeded();
                        let headers = getHeaders();
                        const dataColumns = headers.filter(h => h !== 'keterangan');
                        let uniqueMap = new Map();

                        newData.forEach(item => {
                            let signature = buildSignature(item, dataColumns);
                            if (!uniqueMap.has(signature)) {
                                uniqueMap.set(signature, item);
                            } else {
                                const existing = uniqueMap.get(signature);
                                if (item.keterangan && item.keterangan.toLowerCase() === 'selesai') {
                                    uniqueMap.set(signature, item);
                                }
                            }
                        });

                        let cleanedNewData = Array.from(uniqueMap.values());

                        updateProgress(30, "Memeriksa data 'Selesai' yang sudah ada...");
                        const existingSelesai = await fetchAllSelesaiRows(dataColumns);

                        const selesaiSignatures = new Set();
                        existingSelesai.forEach(row => {
                            selesaiSignatures.add(buildSignature(row, dataColumns));
                        });

                        updateProgress(50, `Menyaring data... ${selesaiSignatures.size} data 'Selesai' sudah ada di database.`);

                        const toUpload = [];
                        let skippedCount = 0;
                        cleanedNewData.forEach(item => {
                            let dataSig = buildSignature(item, dataColumns);
                            if (item.keterangan && item.keterangan.toLowerCase() === 'selesai') {
                                toUpload.push(item);
                            } else if (selesaiSignatures.has(dataSig)) {
                                skippedCount++;
                            } else {
                                toUpload.push(item);
                            }
                        });

                        if (skippedCount > 0) {
                            updateProgress(60, `Dilewati: ${skippedCount} baris sudah 'Selesai' di database.`);
                        }

                        if (toUpload.length === 0) {
                            hideProgress();
                            alert(`Tidak ada data baru untuk diunggah.\n${skippedCount} baris dilewati (sudah 'Selesai' di database).`);
                            resetUploadState();
                            return;
                        }

                        try {
                            await sendToBackendInChunks(toUpload, 10000);
                        } catch (error) {
                            console.error('Gagal mengunggah data Excel:', error);
                            hideProgress();
                            alert(`Upload gagal: ${error.message}`);
                        } finally {
                            hideProgress();
                            resetUploadState();
                            resetPagination();
                            fetchServerCounts();
                            fetchPaginatedData();
                        }
                    } catch (error) {
                        console.error('Gagal memproses file Excel:', error);
                        hideProgress();
                        alert(`Terjadi kesalahan saat memproses file: ${error.message}`);
                        resetUploadState();
                    }
                };

                reader.readAsArrayBuffer(file);
            }, 50);
        });
    }

    if (btnPrint) {
        btnPrint.addEventListener('click', async function() {
            const btn = this;
            const originalText = btn.innerText;
            btn.innerText = "Mengekspor... Mohon tunggu";
            btn.disabled = true;

            try {
                showProgress("Mengekspor ke Excel", 5, "Mengambil data dari database...");
                const allExportData = await fetchAllDataConcurrently();
                if (!allExportData || allExportData.length === 0) {
                    hideProgress();
                    alert("Tidak ada data untuk diexport di database.");
                    return;
                }

                const columns = DB_COLUMNS;
                const formattedHeaders = ["NO"];
                for (let i = 0; i < columns.length; i++) {
                    formattedHeaders.push(columns[i].replace(/_/g, ' ').toUpperCase());
                }

                const aoaData = [formattedHeaders];
                const totalRows = allExportData.length;

                for (let i = 0; i < totalRows; i++) {
                    const row = allExportData[i];
                    const rowArray = [i + 1];
                    for (let j = 0; j < columns.length; j++) {
                        const col = columns[j];
                        rowArray.push(toCellString(row[col]));
                    }
                    aoaData.push(rowArray);
                    if (i % 10000 === 0) {
                        const percent = 80 + Math.round((i / totalRows) * 18);
                        updateProgress(percent, `Menyiapkan file: ${i.toLocaleString('id-ID')} / ${totalRows.toLocaleString('id-ID')} baris`);
                    }
                }
                allExportData.length = 0;

                updateProgress(99, "Menulis file Excel...");
                const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Cimahi");
                XLSX.writeFile(workbook, "Data_Kwalitas_Cimahi.xlsx");

                updateProgress(100, "Selesai!");
                setTimeout(hideProgress, 500);
            } catch (error) {
                console.error("Gagal mengekspor data:", error);
                hideProgress();
                alert("Terjadi kesalahan saat mengekspor data.");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
}

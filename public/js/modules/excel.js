import { supabaseClient, TABLE_NAME, DB_COLUMNS, ID_COLUMNS } from '../config/supabase.js';
import { fetchServerCounts } from './stats.js';
import { fetchAllDataConcurrently, resetPagination, fetchPaginatedData } from './table.js';
import { showProgress, updateProgress, hideProgress } from './progress.js';

const DATA_COLUMNS = DB_COLUMNS.filter(c => c !== 'keterangan' && !ID_COLUMNS.includes(c));
// Satu baris dianggap duplikat HANYA jika SEMUA kolom ini sama persis.
// Beda satu nilai saja (mis. luas 100 vs 101) = baris unik.
// 'keterangan' sengaja tidak ikut, supaya Belum Selesai -> Selesai tetap baris yang sama.
const ROW_COLUMNS = DB_COLUMNS.filter(c => c !== 'keterangan');

export function cleanSuratUkur(value) {
    const str = toCellString(value);
    if (!str) return "";

    const normalized = str.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
    const parts = normalized.split('/');
    if (parts.length !== 3 || !/^\d{4}$/.test(parts[2].trim())) return normalized;

    const head = parts[0].trim();
    const m2 = head.match(/^(SU|GS)[.\s-]*(\d+)$/i);
    if (m2) return `${m2[1].toUpperCase()} ${m2[2]}/${parts[2].trim()}`;
    return `${head.replace(/\s+/g, ' ')}/${parts[2].trim()}`;
}

function normalizeIdentifierValue(column, value) {
    const str = toCellString(value);
    if (!str) return '';

    if (column === 'surat_ukur') {
        return cleanSuratUkur(str);
    }

    return str.replace(/\s+/g, ' ').trim();
}

// Semua kolom DB bertipe string — seluruh nilai Excel dipaksa jadi string
// sebelum signature/upsert, supaya angka di Excel ("238") identik dengan
// teks di DB ("238") dan ON CONFLICT bisa match.
export function toCellString(value) {
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

export function buildSignature(row, cols) {
    return cols.map(col => normalizeIdentifierValue(col, row[col])).join('__');
}

// Hanya dua nilai yang valid di DB: 'Selesai' dan 'Belum Selesai'.
// 'selesai' / 'SELESAI' / ' Selesai ' semuanya jadi 'Selesai'.
function normalizeKeterangan(value) {
    return toCellString(value).toLowerCase() === 'selesai' ? 'Selesai' : 'Belum Selesai';
}

function isSelesai(row) {
    return normalizeKeterangan(row.keterangan) === 'Selesai';
}

function hasIdentifier(row) {
    return ID_COLUMNS.every(c => normalizeIdentifierValue(c, row[c]) !== '');
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

    normalizedRow.keterangan = normalizeKeterangan(normalizedRow.keterangan);
    return normalizedRow;
}

// Payload untuk fungsi SQL upsert_kwalitas_batch.
// Semua baris WAJIB punya key yang sama persis (semua kolom, selalu string).
// Sel kosong dikirim '' dan diubah jadi NULL oleh fungsi SQL.
function toUpsertPayload(item) {
    const payload = {};
    ID_COLUMNS.forEach(c => { payload[c] = normalizeIdentifierValue(c, item[c]); });
    DATA_COLUMNS.forEach(c => { payload[c] = toCellString(item[c]); });
    payload.keterangan = normalizeKeterangan(item.keterangan);
    return payload;
}

// Dedup di dalam file: baris dianggap kembar hanya jika SEMUA kolom (kecuali
// keterangan) identik dengan yang akan dikirim ke database. Baris yang beda
// satu nilai saja tetap dikirim semua. Jika kembar: prefer 'Selesai'; jika
// sama-sama bukan Selesai, baris pertama dipertahankan.
function dedupByRow(rows) {
    const rowMap = new Map();
    rows.forEach(item => {
        const payload = toUpsertPayload(item);
        const key = JSON.stringify(ROW_COLUMNS.map(c => payload[c]));
        const existing = rowMap.get(key);
        if (!existing || (isSelesai(item) && !isSelesai(existing))) {
            rowMap.set(key, item);
        }
    });
    return Array.from(rowMap.values());
}

function validateExcelHeaders(rawHeaders) {
    const excelHeaders = new Set(rawHeaders.map(h => normalizeHeader(h)));
    const missing = DB_COLUMNS.filter(c => !excelHeaders.has(c));
    const matched = DB_COLUMNS.length - missing.length;

    if (matched === 0) {
        return { ok: false, missing, message: 'Tidak ada kolom Excel yang cocok dengan database. Periksa nama header file.' };
    }

    const missingIdentifiers = ID_COLUMNS.filter(c => missing.includes(c));
    if (missingIdentifiers.length > 0) {
        return { ok: false, missing, message: `Kolom identifier wajib tidak ditemukan di Excel: ${missingIdentifiers.join(', ')}` };
    }

    if (missing.length > 0) {
        console.warn('Kolom Excel tidak ditemukan (tidak dikirim saat upsert):', missing);
    }
    return { ok: true, missing };
}

export async function sendToBackendInChunks(dataArray, chunkSize = 2000) {
    const summary = { total: 0, inserted: 0, promoted: 0, skipped: 0 };
    if (!dataArray || dataArray.length === 0) return summary;

    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError) throw new Error(`Gagal memeriksa sesi login: ${sessionError.message}`);
    if (!session) {
        throw new Error('Sesi login sudah berakhir. Silakan login kembali.');
    }

    const payloads = dataArray.map(toUpsertPayload);
    let processed = 0;
    const total = payloads.length;

    showProgress("Mengunggah Data ke Database", 0, `0 / ${total.toLocaleString('id-ID')} baris (0%)`);

    const fileInput = document.getElementById('fileUploadExcel');
    const uploadButton = document.getElementById('btnUploadExcel');
    if (fileInput) fileInput.disabled = true;
    if (uploadButton) uploadButton.disabled = true;

    const totalChunks = Math.ceil(total / chunkSize);
    const errors = [];
    let failedBatch = -1;

    for (let i = 0; i < totalChunks; i++) {
        const from = i * chunkSize;
        const chunk = payloads.slice(from, from + chunkSize);

        const { data: result, error } = await supabaseClient
            .rpc('upsert_kwalitas_batch', { rows: chunk });

        if (error) {
            console.error(`Gagal batch ${i + 1}:`, error.message);
            errors.push(`Batch ${i + 1}: ${error.message}`);
            failedBatch = i + 1;
            break;
        }

        processed += chunk.length;
        if (result) {
            summary.inserted += result.inserted || 0;
            summary.promoted += result.promoted || 0;
            summary.skipped += result.skipped || 0;
        }
        summary.total = processed;

        const percent = Math.min(100, Math.round((processed / total) * 100));
        updateProgress(percent, `Memproses: ${processed.toLocaleString('id-ID')} / ${total.toLocaleString('id-ID')} baris (${percent}%)`);

        await new Promise(r => setTimeout(r, 10));
    }

    if (fileInput) fileInput.disabled = false;
    if (uploadButton) uploadButton.disabled = false;

    if (errors.length > 0) {
        const savedNote = processed > 0
            ? ` ${processed.toLocaleString('id-ID')} baris pada batch sebelumnya sudah diproses.`
            : '';
        throw new Error(`Gagal di batch ${failedBatch}/${totalChunks}. ${errors[0]}.${savedNote}`);
    }

    const fmt = n => n.toLocaleString('id-ID');
    const ringkas = `${fmt(summary.inserted)} baru, ${fmt(summary.promoted)} jadi 'Selesai', ${fmt(summary.skipped)} dilewati (sudah ada).`;
    updateProgress(100, `Selesai! ${ringkas}`);
    setTimeout(() => {
        hideProgress();
        const toast = document.getElementById('excelUploadToast');
        if (toast) {
            toast.innerHTML = `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>File berhasil diupload — ${ringkas}</span>`;
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 10000);
        }
    }, 500);

    fetchServerCounts();
    return summary;
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

                        const withId = newData.filter(hasIdentifier);
                        const skippedNoId = newData.length - withId.length;

                        const cleanedNewData = dedupByRow(withId);

                        // Filter duplikat (seluruh kolom identik) & aturan Selesai dijalankan di
                        // database (fungsi upsert_kwalitas_batch), bukan di browser.
                        const toUpload = cleanedNewData;
                        const dupInFile = withId.length - cleanedNewData.length;

                        const skipNotes = [];
                        if (skippedNoId > 0) skipNotes.push(`${skippedNoId} baris tanpa identifier lengkap`);
                        if (dupInFile > 0) skipNotes.push(`${dupInFile} baris identik di dalam file`);
                        if (skipNotes.length > 0) {
                            updateProgress(40, `Dilewati: ${skipNotes.join(', ')}.`);
                        }

                        if (toUpload.length === 0) {
                            hideProgress();
                            alert(`Tidak ada data untuk diunggah.\n${skipNotes.join('\n') || '0 baris.'}`);
                            resetUploadState();
                            return;
                        }

                        try {
                            await sendToBackendInChunks(toUpload);
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

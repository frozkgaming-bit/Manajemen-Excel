import { supabaseClient, TABLE_NAME, DB_COLUMNS } from '../config/supabase.js';
import { fetchServerCounts } from './stats.js';
import { setupHeadersIfNeeded, fetchAllDataConcurrently, getHeaders, resetPagination, fetchPaginatedData } from './table.js';
import { showProgress, updateProgress, hideProgress } from './progress.js';

function cleanSuratUkur(value) {
    if (!value) return "";
    const str = value.toString().trim();
    const match = str.match(/^((?:SU|GS)?[.\s]?\d+)\/[^/]+\/(\d{4})$/i);
    if (match) return `${match[1].trim()}/${match[2]}`;
    return str;
}

const ON_CONFLICT_COLUMNS = DB_COLUMNS.filter(c => c !== 'keterangan').join(',');

function normalizeHeader(header) {
    return header
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
}

function normalizeExcelRow(row) {
    const normalizedRow = {};

    Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = normalizeHeader(key);
        if (DB_COLUMNS.includes(normalizedKey)) {
            normalizedRow[normalizedKey] = value;
        }
    });

    if (!normalizedRow.keterangan) normalizedRow.keterangan = 'Belum Selesai';
    return normalizedRow;
}

export async function sendToBackendInChunks(dataArray, chunkSize = 10000) {
    if (!dataArray || dataArray.length === 0) return;
    
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
        alert(`Selesai! Berhasil menyimpan ${successCount} dari ${total} baris ke database.`);
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
            if (file) {
                if (fileNameEl) fileNameEl.textContent = file.name;
            } else {
                if (fileNameEl) fileNameEl.textContent = 'No file chosen';
            }
        });
    }

    const btnUploadExcel = document.getElementById('btnUploadExcel');
    if (btnUploadExcel) {
        btnUploadExcel.addEventListener('click', function() {
            var fileInput = document.getElementById('fileUploadExcel');
            var file = fileInput ? fileInput.files[0] : null;
            if (!file) {
                alert('Pilih file Excel terlebih dahulu.');
                return;
            }

            showProgress("Membaca File Excel", 10, "Sedang memproses file, mohon tunggu...");

            setTimeout(() => {
                var reader = new FileReader();
                reader.onload = async function(e) {
                    var data = new Uint8Array(e.target.result);
                    var workbook = XLSX.read(data, {type: 'array'});
                    var firstSheetName = workbook.SheetNames[0];
                    var worksheet = workbook.Sheets[firstSheetName];
                    var rawData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});
                    
                    if (rawData.length === 0) { 
                        hideProgress();
                        alert("File kosong."); 
                        return; 
                    }

                    var newData = rawData.map(normalizeExcelRow);
                    newData.forEach(row => {
                        if (row.surat_ukur) row.surat_ukur = cleanSuratUkur(row.surat_ukur);
                    });

                    setupHeadersIfNeeded();
                    let headers = getHeaders();
                    let uniqueMap = new Map();

                    newData.forEach(item => {
                        let signature = headers.map(header => (item[header] !== undefined && item[header] !== null ? item[header].toString().trim() : '')).join('__');
                        uniqueMap.set(signature, item);
                    });

                    let cleanedNewData = Array.from(uniqueMap.values());

                    updateProgress(30, "Memeriksa data 'Selesai' yang sudah ada...");
                    const dataColumns = DB_COLUMNS.filter(c => c !== 'keterangan');
                    const selectCols = dataColumns.join(',');
                    const { data: existingSelesai } = await supabaseClient
                        .from(TABLE_NAME)
                        .select(selectCols)
                        .eq('keterangan', 'Selesai');

                    const selesaiSignatures = new Set();
                    if (existingSelesai && existingSelesai.length > 0) {
                        existingSelesai.forEach(row => {
                            let sig = dataColumns.map(col => (row[col] !== undefined && row[col] !== null ? row[col].toString().trim() : '')).join('__');
                            selesaiSignatures.add(sig);
                        });
                    }

                    updateProgress(50, `Menyaring data... ${selesaiSignatures.size} data 'Selesai' sudah ada di database.`);

                    const toUpload = [];
                    let skippedCount = 0;
                    cleanedNewData.forEach(item => {
                        let dataSig = dataColumns.map(col => (item[col] !== undefined && item[col] !== null ? item[col].toString().trim() : '')).join('__');
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
                        resetPagination();
                        fetchServerCounts();
                        fetchPaginatedData();
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
                        rowArray.push(row[col] !== undefined && row[col] !== null ? row[col] : '');
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

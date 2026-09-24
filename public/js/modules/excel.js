import { supabaseClient, TABLE_NAME, DB_COLUMNS } from '../config/supabase.js';
import { fetchServerCounts } from './stats.js';
import { setupHeadersIfNeeded, loadMoreData, fetchAllDataConcurrently, getHeaders, getAllData, setAllData, setFilteredData, setCurrentIndex } from './table.js';
import { showProgress, updateProgress, hideProgress } from './progress.js';

function cleanSuratUkur(value) {
    if (!value) return "";
    const str = value.toString().trim();
    const match = str.match(/^((?:SU|GS)?[.\s]?\d+)\/[^/]+\/(\d{4})$/i);
    if (match) return `${match[1].trim()}/${match[2]}`;
    return str;
}

const ON_CONFLICT_COLUMNS = [...DB_COLUMNS].join(',');

export async function sendToBackendInChunks(dataArray, chunkSize = 10000) {
    if (!dataArray || dataArray.length === 0) return;
    
    let successCount = 0;
    const total = dataArray.length;

    showProgress("Mengunggah Data ke Database", 0, `0 / ${total.toLocaleString('id-ID')} baris (0%)`);

    const fileInput = document.getElementById('fileUploadExcel');
    if (fileInput) fileInput.disabled = true;

    const totalChunks = Math.ceil(total / chunkSize);
    for (let i = 0; i < totalChunks; i++) {
        const from = i * chunkSize;
        const chunk = dataArray.slice(from, from + chunkSize);

        const { error } = await supabaseClient
            .from(TABLE_NAME)
            .upsert(chunk, { onConflict: ON_CONFLICT_COLUMNS });

        if (error) {
            console.error(`Gagal batch ${i + 1}:`, error.message);
        } else {
            successCount += chunk.length;
        }

        const percent = Math.min(100, Math.round((successCount / total) * 100));
        updateProgress(percent, `Mengunggah: ${successCount.toLocaleString('id-ID')} / ${total.toLocaleString('id-ID')} baris (${percent}%)`);
        
        await new Promise(r => setTimeout(r, 10));
    }

    if (fileInput) fileInput.disabled = false;

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

            showProgress("Membaca File Excel", 15, "Sedang memproses file, mohon tunggu...");

            setTimeout(() => {
                var reader = new FileReader();
                reader.onload = function(e) {
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

                    var newData = rawData.map(function(row) {
                        var lowerRow = {};
                        for (var key in row) lowerRow[key.toLowerCase()] = row[key];
                        if (lowerRow['surat_ukur']) lowerRow['surat_ukur'] = cleanSuratUkur(lowerRow['surat_ukur']);
                        if (!lowerRow['keterangan']) lowerRow['keterangan'] = 'Belum Selesai';
                        return lowerRow;
                    });

                    setupHeadersIfNeeded();
                    let headers = getHeaders();
                    let uniqueMap = new Map();

                    newData.forEach(item => {
                        let signature = headers.map(header => (item[header] !== undefined && item[header] !== null ? item[header].toString().trim() : '')).join('__');
                        uniqueMap.set(signature, item);
                    });

                    let cleanedNewData = Array.from(uniqueMap.values());
                    let allData = getAllData();
                    let mapIndex = new Map();

                    allData.forEach((item, idx) => {
                        let signature = headers.map(header => (item[header] !== undefined && item[header] !== null ? item[header].toString().trim() : '')).join('__');
                        mapIndex.set(signature, idx);
                    });

                    cleanedNewData.forEach(newItem => {
                        let newSignature = headers.map(header => (newItem[header] !== undefined && newItem[header] !== null ? newItem[header].toString().trim() : '')).join('__');
                        if (mapIndex.has(newSignature)) {
                            allData[mapIndex.get(newSignature)] = newItem;
                        } else {
                            allData.push(newItem);
                            mapIndex.set(newSignature, allData.length - 1);
                        }
                    });

                    setAllData(allData);
                    setFilteredData([...allData]);
                    setCurrentIndex(0);
                    
                    const tableBody = document.getElementById('tableBody');
                    if (tableBody) tableBody.innerHTML = "";

                    loadMoreData();
                    fetchServerCounts();
                    sendToBackendInChunks(cleanedNewData, 10000).finally(() => {
                        hideProgress();
                    });
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

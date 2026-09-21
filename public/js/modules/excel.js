import { supabaseClient, TABLE_NAME, DB_COLUMNS } from '../config/supabase.js';
import { fetchServerCounts } from './stats.js';
import { setupHeadersIfNeeded, appendData, loadMoreData, fetchAllDataConcurrently, getHeaders, getAllData } from './table.js';

function cleanSuratUkur(value) {
    if (!value) return "";
    const str = value.toString().trim();
    
    const match = str.match(/^((?:SU|GS)?[.\s]?\d+)\/[^/]+\/(\d{4})$/i);
    if (match) {
        return `${match[1].trim()}/${match[2]}`;
    }
    
    return str;
}

export async function sendToBackendInChunks(dataArray, chunkSize = 2000) {
    if (!dataArray || dataArray.length === 0) return;

    let successCount = 0;
    const totalChunks = Math.ceil(dataArray.length / chunkSize);
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    const uploadMain = document.getElementById('fileUploadMain');
    const uploadDone = document.getElementById('fileUploadDone');
    
    if (loadingIndicator) loadingIndicator.style.display = "block";
    if (uploadMain) uploadMain.disabled = true;
    if (uploadDone) uploadDone.disabled = true;

    for (let i = 0; i < totalChunks; i++) {
        const from = i * chunkSize;
        const chunk = dataArray.slice(from, from + chunkSize);
        
        if (loadingIndicator) {
            loadingIndicator.innerText = `Mengunggah ${successCount} / ${dataArray.length} baris...`;
        }

        const { error } = await supabaseClient
            .from(TABLE_NAME)
            .upsert(chunk, { onConflict: 'kelurahan,nomor_hak,surat_ukur,nib,luas,produk,luas_peta,validator_tekstual,validator_peta,blokir_internal,kw,pemilik_pertama,pemilik_akhir,tipe_hak' });

        if (error) {
            console.error(`Batch ${i + 1} error:`, error.message);
        } else {
            successCount += chunk.length;
        }
    }

    if (loadingIndicator) {
        loadingIndicator.style.display = "none";
        loadingIndicator.innerText = "Memuat data...";
    }
    if (uploadMain) uploadMain.disabled = false;
    if (uploadDone) uploadDone.disabled = false;

    alert(`Selesai! Berhasil menyimpan ${successCount} / ${dataArray.length} baris.`);
    fetchServerCounts();
}

export function initExcelHandlers() {
    const fileUploadMain = document.getElementById('fileUploadMain');
    const fileUploadDone = document.getElementById('fileUploadDone');
    const btnPrint = document.getElementById('btnPrint');

    if (fileUploadMain) {
        fileUploadMain.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            
            var reader = new FileReader();
            reader.onload = function(e) {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, {type: 'array'});
                var firstSheetName = workbook.SheetNames[0];
                var worksheet = workbook.Sheets[firstSheetName];
                var rawData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});

                if(rawData.length === 0) {
                    alert("File kosong.");
                    return;
                }

                var newData = rawData.map(function(row) {
                    var lowerRow = {};
                    for (var key in row) {
                        lowerRow[key.toLowerCase()] = row[key];
                    }
                    
                    if (lowerRow['surat_ukur']) {
                        lowerRow['surat_ukur'] = cleanSuratUkur(lowerRow['surat_ukur']);
                    }
                    
                    return lowerRow;
                });

                newData.forEach(row => {
                    row['keterangan'] = "Belum Selesai";
                });

                setupHeadersIfNeeded();

                let headers = getHeaders();
                let uniqueMap = new Map();
                newData.forEach(item => {
                    item['keterangan'] = "Belum Selesai";
                    let signature = headers
                        .filter(header => header !== 'keterangan')
                        .map(header => (item[header] !== undefined && item[header] !== null ? item[header].toString().trim() : ''))
                        .join('__');
                    
                    uniqueMap.set(signature, item);
                });
                
                let cleanedNewData = Array.from(uniqueMap.values());
                appendData(cleanedNewData);
                
                document.getElementById('searchInput').value = ""; 
                document.getElementById('tableBody').innerHTML = ""; 
                
                loadMoreData();
                fetchServerCounts();
                
                sendToBackendInChunks(cleanedNewData, 10000);
                
                e.target.value = ""; 
            };
            reader.readAsArrayBuffer(file);
        });
    }

    if (fileUploadDone) {
        fileUploadDone.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            
            var reader = new FileReader();
            reader.onload = function(e) {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, {type: 'array'});
                var firstSheetName = workbook.SheetNames[0];
                var worksheet = workbook.Sheets[firstSheetName];
                var rawData = XLSX.utils.sheet_to_json(worksheet, {defval: ""});

                if(rawData.length === 0) {
                    alert("File kosong.");
                    return;
                }

                var newData = rawData.map(function(row) {
                    var lowerRow = {};
                    for (var key in row) {
                        lowerRow[key.toLowerCase()] = row[key];
                    }
                    
                    if (lowerRow['surat_ukur']) {
                        lowerRow['surat_ukur'] = cleanSuratUkur(lowerRow['surat_ukur']);
                    }
                    
                    return lowerRow;
                });

                setupHeadersIfNeeded();

                let headers = getHeaders();
                let uniqueMap = new Map();
                newData.forEach(item => {
                    item['keterangan'] = "Selesai";
                    let signature = headers
                        .filter(header => header !== 'keterangan')
                        .map(header => (item[header] !== undefined && item[header] !== null ? item[header].toString().trim() : ''))
                        .join('__');
                    
                    uniqueMap.set(signature, item);
                });
                
                let cleanedNewData = Array.from(uniqueMap.values());
                let allData = getAllData();
                let mapIndex = new Map();

                allData.forEach((item, idx) => {
                    let signature = headers
                        .filter(header => header !== 'keterangan')
                        .map(header => (item[header] !== undefined && item[header] !== null ? item[header].toString().trim() : ''))
                        .join('__');
                    mapIndex.set(signature, idx);
                });

                cleanedNewData.forEach(newItem => {
                    let newSignature = headers
                        .filter(header => header !== 'keterangan')
                        .map(header => (newItem[header] !== undefined && newItem[header] !== null ? newItem[header].toString().trim() : ''))
                        .join('__');

                    if (mapIndex.has(newSignature)) {
                        let existingIndex = mapIndex.get(newSignature);
                        allData[existingIndex] = newItem;
                    } else {
                        allData.push(newItem);
                        mapIndex.set(newSignature, allData.length - 1);
                    }
                });
                
                document.getElementById('searchInput').value = ""; 
                document.getElementById('tableBody').innerHTML = ""; 
                
                loadMoreData();
                fetchServerCounts();
                
                sendToBackendInChunks(cleanedNewData, 10000);
                
                e.target.value = ""; 
            };
            reader.readAsArrayBuffer(file);
        });
    }

    if (btnPrint) {
        btnPrint.addEventListener('click', async function() {
            const btn = this;
            const originalText = btn.innerText;
            
            btn.innerText = "Mengekspor... Mohon tunggu";
            btn.disabled = true;

            try {
                const allExportData = await fetchAllDataConcurrently();
                
                if (!allExportData || allExportData.length === 0) {
                    alert("Tidak ada data untuk diexport di database.");
                    return;
                }

                const columns = DB_COLUMNS;

                const formattedHeaders = ["NO"];
                for (let i = 0; i < columns.length; i++) {
                    formattedHeaders.push(columns[i].replace(/_/g, ' ').toUpperCase());
                }

                const aoaData = [formattedHeaders];

                for (let i = 0; i < allExportData.length; i++) {
                    const row = allExportData[i];
                    const rowArray = [i + 1];
                    
                    for (let j = 0; j < columns.length; j++) {
                        const col = columns[j];
                        rowArray.push(row[col] !== undefined && row[col] !== null ? row[col] : '');
                    }
                    
                    aoaData.push(rowArray);
                }

                allExportData.length = 0; 

                const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Cimahi");
                XLSX.writeFile(workbook, "Data_Kwalitas_Cimahi.xlsx");

            } catch (error) {
                console.error("Gagal mengekspor data:", error);
                alert("Terjadi kesalahan saat mengekspor data.");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
}

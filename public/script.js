async function sendToBackendInChunks(endpoint, dataArray, chunkSize = 1000) {
    let successCount = 0;
    const maxConcurrent = 5; // Kirim 3 batch secara bersamaan (paralel)
    let promises = [];

    for (let i = 0; i < dataArray.length; i += chunkSize) {
        const chunk = dataArray.slice(i, i + chunkSize);
        
        console.log(`Menyiapkan batch baris ${i + 1} hingga ${i + chunk.length}...`);
        
        // Buat promise fetch tanpa await langsung
        const requestPromise = fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataList: chunk })
        })
        .then(async (response) => {
            const result = await response.json();
            if (!result.success) {
                console.error(`Gagal pada batch: ${result.error}`);
            } else {
                successCount += chunk.length;
            }
        })
        .catch(err => {
            console.error(`Koneksi terputus saat mengirim batch:`, err);
        });

        promises.push(requestPromise);

        // Jika jumlah request paralel sudah mencapai batas, tunggu sampai selesai
        if (promises.length >= maxConcurrent) {
            await Promise.all(promises);
            promises = []; // Kosongkan antrean
        }
    }
    
    // Tunggu sisa batch yang mungkin belum selesai
    if (promises.length > 0) {
        await Promise.all(promises);
    }
    
    alert(`Selesai! Berhasil memproses ${successCount} dari ${dataArray.length} baris.`);
}

let allData = []; 
let filteredData = []; 
let headers = []; 
let currentIndex = 0; 
const batchSize = 50; 

// Pagination state untuk pull data
let currentPullPage = 1;
let isPulling = false;
let hasMorePullData = true; 
let currentSearchTerm = "";
let searchTimeout = null; 

const tableBody = document.getElementById('tableBody');
const tableHead = document.getElementById('tableHead');
const scrollWrapper = document.getElementById('tableScrollWrapper');
const loadingIndicator = document.getElementById('loadingIndicator');
const searchInput = document.getElementById('searchInput');

// Fungsi pembantu untuk merender header tabel
function setupHeadersIfNeeded(sampleRow) {
    if (allData.length === 0) {
        headers = Object.keys(sampleRow); // Mengambil nama kolom yang sudah di-lowercase[cite: 1]
        
        let headerHtml = '<tr><th class="col-id">No ID</th>';
        headers.forEach(function(header) {
            headerHtml += `<th>${header}</th>`;
        });
        headerHtml += '</tr>';
        tableHead.innerHTML = headerHtml;
    } else {
        if (!headers.includes('keterangan')) {
            headers.push('keterangan');
        }
    }
}

// 1. Event listener untuk Basis Data Utama
document.getElementById('fileUploadMain').addEventListener('change', function(e) {
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

        // MENGUBAH SEMUA HEADER MENJADI LOWERCASE
        var newData = rawData.map(function(row) {
            var lowerRow = {};
            for (var key in row) {
                lowerRow[key.toLowerCase()] = row[key];
            }
            return lowerRow;
        });

        newData.forEach(row => {
            row['keterangan'] = "Belum Selesai";
        });

        setupHeadersIfNeeded(newData[0]);

        // --- TAMBAHAN: HAPUS DUPLIKAT INTERNAL DALAM 1 FILE EXCEL ---
        let uniqueMap = new Map();
        newData.forEach(item => {
            item['keterangan'] = "Belum Selesai";
            // Buat signature unik berdasarkan seluruh kolom (kecuali keterangan)
            let signature = headers
                .filter(header => header !== 'keterangan')
                .map(header => (item[header] !== undefined && item[header] !== null ? item[header].toString().trim() : ''))
                .join('__');
            
            // Hanya ambil baris terakhir/unik jika ada yang kembar di file yang sama
            uniqueMap.set(signature, item);
        });
        
        let cleanedNewData = Array.from(uniqueMap.values());
        // ------------------------------------------------------------

        allData = allData.concat(cleanedNewData);
        
        searchInput.value = ""; 
        filteredData = [...allData]; 
        currentIndex = 0;
        tableBody.innerHTML = ""; 
        
        loadMoreData();
        fetchServerCounts();
        
        // --- TAMBAHKAN BARIS INI UNTUK MENGIRIM KE SUPABASE ---
        sendToBackendInChunks('/api/upload-main', cleanedNewData, 1000);
        // ------------------------------------------------------
        
        e.target.value = ""; 
    };

    reader.readAsArrayBuffer(file);
});

// 2. Event listener untuk Data Selesai (Upsert Sensitif)
document.getElementById('fileUploadDone').addEventListener('change', function(e) {
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

        // MENGUBAH SEMUA HEADER MENJADI LOWERCASE
        var newData = rawData.map(function(row) {
            var lowerRow = {};
            for (var key in row) {
                lowerRow[key.toLowerCase()] = row[key];
            }
            return lowerRow;
        });

        setupHeadersIfNeeded(newData[0]);

        // --- TAMBAHAN: HAPUS DUPLIKAT INTERNAL DALAM 1 FILE EXCEL ---
        let uniqueMap = new Map();
        newData.forEach(item => {
            item['keterangan'] = "Selesai";
            // Buat signature unik berdasarkan seluruh kolom (kecuali keterangan)
            let signature = headers
                .filter(header => header !== 'keterangan')
                .map(header => (item[header] !== undefined && item[header] !== null ? item[header].toString().trim() : ''))
                .join('__');
            
            // Hanya ambil baris terakhir/unik jika ada yang kembar di file yang sama
            uniqueMap.set(signature, item);
        });
        
        let cleanedNewData = Array.from(uniqueMap.values());
        // ------------------------------------------------------------

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
        
        searchInput.value = ""; 
        filteredData = [...allData]; 
        currentIndex = 0;
        tableBody.innerHTML = ""; 
        
        loadMoreData();
        fetchServerCounts();
        
        // --- TAMBAHKAN BARIS INI UNTUK MENGIRIM KE SUPABASE ---
        sendToBackendInChunks('/api/upload-done', cleanedNewData, 1000);
        // ------------------------------------------------------
        
        e.target.value = ""; 
    };

    reader.readAsArrayBuffer(file);
});

searchInput.addEventListener('input', function(e) {
    currentSearchTerm = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPullPage = 1;
        hasMorePullData = true;
        allData = []; 
        filteredData = [];
        currentIndex = 0;
        document.getElementById('tableBody').innerHTML = "";
        
        fetchPaginatedData();
    }, 500);
});

function loadMoreData() {
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

// Fungsi untuk memperbarui tampilan jumlah data
// Ponytail: Fungsi ini dihentikan karena perhitungan beralih ke server-side.
// Gunakan fetchServerCounts() untuk sinkronisasi dengan database.
function updateDataCount() {
    return;
}

scrollWrapper.addEventListener('scroll', function() {
    if (scrollWrapper.scrollTop + scrollWrapper.clientHeight >= scrollWrapper.scrollHeight - 5) {
        if (currentIndex < filteredData.length) {
            loadMoreData();
        } else {
            fetchPaginatedData();
        }
    }
});

// 1. Fungsi untuk menarik perhitungan global dari server
async function fetchServerCounts() {
    try {
        const response = await fetch('/api/get-counts');
        const result = await response.json();

        if (result.success) {
            document.getElementById('countTotal').innerText = result.total;
            document.getElementById('countSelesai').innerText = result.selesai;
            document.getElementById('countBelum').innerText = result.belum;
        }
    } catch (error) {
        console.error("Gagal mengambil jumlah data dari server:", error);
    }
}

document.getElementById('btnPullData').addEventListener('click', async function() {
    currentPullPage = 1;
    hasMorePullData = true;
    allData = []; 
    document.getElementById('tableBody').innerHTML = "";
    document.getElementById('searchInput').value = ""; // Reset input pencarian
    currentSearchTerm = "";
    
    // Perbarui total data dari database
    fetchServerCounts();
    // Mulai tarik data ke tabel
    await fetchPaginatedData();
});

// 3. Event Listener untuk Input Pencarian (Hanya memengaruhi tabel & "Ditemukan")
document.getElementById('searchInput').addEventListener('input', function(e) {
    currentSearchTerm = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPullPage = 1;
        hasMorePullData = true;
        allData = []; 
        document.getElementById('tableBody').innerHTML = "";
        
        fetchPaginatedData();
    }, 500);
});

// 4. Fungsi untuk menarik data tabel (beserta pagination & search)
async function fetchPaginatedData() {
    if (isPulling || !hasMorePullData) return;
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    isPulling = true;
    loadingIndicator.style.display = "block";

    try {
        const url = `/api/pull-data?page=${currentPullPage}&limit=50&search=${encodeURIComponent(currentSearchTerm)}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            let fetchedData = result.data.map(row => {
                let lowerRow = {};
                for (let key in row) lowerRow[key.toLowerCase()] = row[key];
                return lowerRow;
            });

            setupHeadersIfNeeded(fetchedData[0]);
            allData = allData.concat(fetchedData);
            filteredData = [...allData];
            
            loadMoreData(); 

            // HANYA UPDATE ANGKA "DITEMUKAN" SAAT MENCARI
            const filterSummary = document.getElementById('filterSummary');
            if (currentSearchTerm !== "") {
                filterSummary.style.display = "inline-block";
                document.getElementById('countFiltered').innerText = result.count; 
            } else {
                filterSummary.style.display = "none";
            }
            
            if (result.data.length < result.limit) {
                hasMorePullData = false;
            } else {
                currentPullPage++;
            }
        } else {
            hasMorePullData = false;
            if (currentPullPage === 1) {
                document.getElementById('tableBody').innerHTML = "<tr><td colspan='100%' style='text-align:center;'>Data tidak ditemukan</td></tr>";
                
                if (currentSearchTerm !== "") {
                    document.getElementById('filterSummary').style.display = "inline-block";
                    document.getElementById('countFiltered').innerText = 0;
                }
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        isPulling = false;
        loadingIndicator.style.display = "none";
    }
}

// Event listener untuk tombol Print Seluruh Data
document.getElementById('btnPrint').addEventListener('click', function() {
    if (allData.length === 0) {
        alert("Tidak ada data untuk diprint. Silakan tarik atau upload data terlebih dahulu.");
        return;
    }

    // Membuka jendela baru untuk tampilan print
    let printWindow = window.open('', '_blank');
    
    // Menyusun isi HTML dan tabel
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Print Data EXCEL BOS EDS</title>
        <style>
            body { font-family: sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid black; padding: 6px; text-align: left; }
            th { background-color: #f2f2f2; }
            /* Memastikan background hijau tercetak */
            .row-hijau { background-color: #ccffcc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            h2 { text-align: center; }
            @media print {
                @page { margin: 1cm; }
            }
        </style>
    </head>
    <body>
        <h2>Data EXCEL BOS EDS</h2>
        <table>
            <thead>
                <tr>
                    <th style="width: 40px; text-align: center;">No</th>
                    ${headers.map(h => `<th>${h.toUpperCase()}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${allData.map((row, i) => {
                    let isSelesai = row['keterangan'] && row['keterangan'].toLowerCase() === 'selesai';
                    return `
                    <tr class="${isSelesai ? 'row-hijau' : ''}">
                        <td style="text-align: center;"><b>${i + 1}</b></td>
                        ${headers.map(h => `<td>${row[h] !== undefined ? row[h] : ''}</td>`).join('')}
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        <script>
            // Jalankan print dialog setelah data dimuat
            window.onload = function() {
                window.print();
            };
        </script>
    </body>
    </html>\`;

    // Menuliskan konten ke jendela print
    printWindow.document.write(htmlContent);
    printWindow.document.close();
});
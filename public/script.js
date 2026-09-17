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
        updateDataCount();
        
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
        updateDataCount();
        
        // --- TAMBAHKAN BARIS INI UNTUK MENGIRIM KE SUPABASE ---
        sendToBackendInChunks('/api/upload-done', cleanedNewData, 1000);
        // ------------------------------------------------------
        
        e.target.value = ""; 
    };

    reader.readAsArrayBuffer(file);
});

searchInput.addEventListener('input', function(e) {
    let searchTerm = e.target.value.toLowerCase();
    
    filteredData = allData.filter(function(row) {
        return headers.some(function(header) {
            let cellValue = row[header] ? row[header].toString().toLowerCase() : "";
            return cellValue.includes(searchTerm);
        });
    });

    currentIndex = 0;
    tableBody.innerHTML = "";
    loadMoreData();
    updateDataCount();
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
function updateDataCount() {
    // 1. Hitung total data
    const total = allData.length;
    
    // 2. Hitung jumlah yang 'Selesai'
    const selesai = allData.filter(row => 
        row['keterangan'] && row['keterangan'].toLowerCase() === 'selesai'
    ).length;
    
    // 3. Hitung jumlah yang 'Belum Selesai'
    const belum = total - selesai;
    
    // Update teks di HTML
    document.getElementById('countTotal').innerText = total;
    document.getElementById('countSelesai').innerText = selesai;
    document.getElementById('countBelum').innerText = belum;
    
    // 4. Hitung data yang difilter (jika sedang melakukan pencarian)
    const searchVal = document.getElementById('searchInput').value;
    const filterSummary = document.getElementById('filterSummary');
    
    if (searchVal.trim() !== "") {
        filterSummary.style.display = "inline-block";
        document.getElementById('countFiltered').innerText = filteredData.length;
    } else {
        filterSummary.style.display = "none";
    }
}

scrollWrapper.addEventListener('scroll', function() {
    if (scrollWrapper.scrollTop + scrollWrapper.clientHeight >= scrollWrapper.scrollHeight - 5) {
        loadMoreData();
    }
});
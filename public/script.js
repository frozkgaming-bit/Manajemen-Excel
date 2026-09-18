// --- KONFIGURASI SUPABASE ---
const SUPABASE_URL = 'https://pmoqzheinikyddkehbhd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3eeK9jTStOQM3JM3VP-VkA_swV4V3_b';
const TABLE_NAME = 'kwalitas_data_cimahi';

// UBAH: Gunakan nama variabel 'supabaseClient' untuk menghindari bentrok dengan global 'supabase'
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMEN DOM ---
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const loginError = document.getElementById('loginError');
const tableBody = document.getElementById('tableBody');
const tableHead = document.getElementById('tableHead');
const scrollWrapper = document.getElementById('tableScrollWrapper');
const loadingIndicator = document.getElementById('loadingIndicator');
const searchInput = document.getElementById('searchInput');

// Variabel Data
let allData = [];
let filteredData = [];
let headers = [];
let currentIndex = 0;
const batchSize = 50;
let currentPullPage = 1;
let isPulling = false;
let hasMorePullData = true;
let currentSearchTerm = "";
let searchTimeout = null;

// --- AUTENTIKASI ---
async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        loginSection.style.display = 'none';
        appSection.style.display = 'block';
        fetchServerCounts();
    } else {
        loginSection.style.display = 'block';
        appSection.style.display = 'none';
    }
}

btnLogin.addEventListener('click', async () => {
    const usernameInput = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    const email = `${usernameInput}@admin.sistem`;
    
    loginError.style.display = 'none';
    btnLogin.innerText = "Loading...";
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    btnLogin.innerText = "Login";
    if (error) {
        loginError.innerText = "Error Supabase: " + error.message;
        loginError.style.display = 'block';
    } else {
        checkUser();
    }
});

btnLogout.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    checkUser();
});

checkUser();

// --- FUNGSI CRUD: UPLOAD/UPSERT ---
async function sendToBackendInChunks(dataArray, chunkSize = 1000) {
    let successCount = 0;
    
    for (let i = 0; i < dataArray.length; i += chunkSize) {
        const chunk = dataArray.slice(i, i + chunkSize);
        console.log(`Mengirim batch baris ${i + 1} hingga ${i + chunk.length}...`);
        
        const { data, error } = await supabaseClient
            .from(TABLE_NAME)
            .upsert(chunk, { onConflict: 'kelurahan,nomor_hak,surat_ukur,nib,luas,produk,luas_peta,validator_tekstual,validator_peta,blokir_internal,kw,pemilik_pertama,pemilik_akhir,tipe_hak' });
            
        if (error) {
            console.error(`Gagal pada batch:`, error.message);
        } else {
            successCount += chunk.length;
        }
    }
    alert(`Selesai! Berhasil memproses ${successCount} dari ${dataArray.length} baris.`);
}

// --- FUNGSI CRUD: READ/COUNT ---
async function fetchServerCounts() {
    try {
        const { count: total, error: errTotal } = await supabaseClient
            .from(TABLE_NAME).select('*', { count: 'exact', head: true });
            
        const { count: selesai, error: errSelesai } = await supabaseClient
            .from(TABLE_NAME).select('*', { count: 'exact', head: true })
            .eq('keterangan', 'Selesai');
            
        if (errTotal || errSelesai) throw errTotal || errSelesai;

        document.getElementById('countTotal').innerText = total || 0;
        document.getElementById('countSelesai').innerText = selesai || 0;
        document.getElementById('countBelum').innerText = (total - selesai) || 0;
    } catch (error) {
        console.error("Gagal mengambil jumlah data:", error);
    }
}

async function fetchPaginatedData() {
    if (isPulling || !hasMorePullData) return;
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    isPulling = true;
    loadingIndicator.style.display = "block";
    
    try {
        const limit = 50;
        const from = (currentPullPage - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseClient.from(TABLE_NAME).select('*').range(from, to);

        if (currentSearchTerm !== "") {
            const textColumns = ['kelurahan','surat_ukur','produk','validator_tekstual','validator_peta','blokir_internal','pemilik_pertama','pemilik_akhir','tipe_hak','keterangan'];
            const numericColumns = ['nomor_hak','nib','luas','luas_peta','kw'];

            const textFilters = textColumns.map(col => `${col}.ilike.%${currentSearchTerm}%`);
            const numericFilters = numericColumns.map(col => `${col}::text.ilike.%${currentSearchTerm}%`);
            
            const orFilter = [...textFilters, ...numericFilters].join(',');
            query = query.or(orFilter);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (data && data.length > 0) {
            setupHeadersIfNeeded(data[0]);
            allData = allData.concat(data);
            filteredData = [...allData];
            loadMoreData(); 

            if (data.length < limit) hasMorePullData = false;
            else currentPullPage++;
        } else {
            hasMorePullData = false;
            if (currentPullPage === 1) {
                document.getElementById('tableBody').innerHTML = "<tr><td colspan='100%' style='text-align:center;'>Data tidak ditemukan</td></tr>";
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        isPulling = false;
        loadingIndicator.style.display = "none";
    }
}

// --- FUNGSI PEMBANTU ---
function setupHeadersIfNeeded(sampleRow) {
    if (allData.length === 0) {
        headers = Object.keys(sampleRow);
        
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

// --- EVENT LISTENER UPLOAD BASIS DATA UTAMA ---
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
        allData = allData.concat(cleanedNewData);
        
        searchInput.value = ""; 
        filteredData = [...allData]; 
        currentIndex = 0;
        tableBody.innerHTML = ""; 
        
        loadMoreData();
        fetchServerCounts();
        
        sendToBackendInChunks(cleanedNewData, 1000);
        
        e.target.value = ""; 
    };
    reader.readAsArrayBuffer(file);
});

// --- EVENT LISTENER UPLOAD DATA SELESAI ---
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

        var newData = rawData.map(function(row) {
            var lowerRow = {};
            for (var key in row) {
                lowerRow[key.toLowerCase()] = row[key];
            }
            return lowerRow;
        });

        setupHeadersIfNeeded(newData[0]);

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
        
        sendToBackendInChunks(cleanedNewData, 1000);
        
        e.target.value = ""; 
    };
    reader.readAsArrayBuffer(file);
});

// --- EVENT LISTENER SEARCH ---
searchInput.addEventListener('input', function(e) {
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

// --- LOAD MORE DATA ---
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

// --- SCROLL LISTENER ---
scrollWrapper.addEventListener('scroll', function() {
    if (scrollWrapper.scrollTop + scrollWrapper.clientHeight >= scrollWrapper.scrollHeight - 5) {
        if (currentIndex < filteredData.length) {
            loadMoreData();
        } else {
            fetchPaginatedData();
        }
    }
});

// --- BTN PULL DATA ---
document.getElementById('btnPullData').addEventListener('click', async function() {
    currentPullPage = 1;
    hasMorePullData = true;
    allData = []; 
    document.getElementById('tableBody').innerHTML = "";
    document.getElementById('searchInput').value = ""; 
    currentSearchTerm = "";
    
    fetchServerCounts();
    await fetchPaginatedData();
});

// --- FETCH ALL DATA CONCURRENTLY (Untuk Print/Export) ---
async function fetchAllDataConcurrently() {
    const limit = 1000;
    let allFetchedData = [];
    
    // 1. Ambil total data terlebih dahulu
    const { count, error: countError } = await supabaseClient
        .from(TABLE_NAME)
        .select('*', { count: 'exact', head: true });
        
    if (countError) {
        console.error("Gagal menghitung data", countError);
        alert("Gagal menghitung total data: " + countError.message);
        return null;
    }

    if (count === 0) {
        return [];
    }

    // 2. Hitung berapa kali request (halaman) yang dibutuhkan
    const totalPages = Math.ceil(count / limit);
    const maxConcurrent = 3; // Maksimal 3 request paralel
    let promises = [];

    // 3. Looping untuk membuat antrean request
    for (let page = 0; page < totalPages; page++) {
        const from = page * limit;
        const to = from + limit - 1;

        console.log(`Menarik data baris ${from + 1} sampai ${to + 1}...`);
        
        // Buat promise fetch tanpa await langsung
        const requestPromise = supabaseClient
            .from(TABLE_NAME)
            .select('*')
            .range(from, to)
            .then(({ data, error }) => {
                if (error) throw error;
                // Gabungkan data yang berhasil ditarik ke array utama
                allFetchedData.push(...data);
            });

        promises.push(requestPromise);

        // Jika jumlah antrean paralel sudah mencapai batas (3), tunggu sampai selesai
        if (promises.length >= maxConcurrent) {
            await Promise.all(promises);
            promises = []; // Kosongkan antrean, lanjut ke batch berikutnya
        }
    }

    // Tunggu sisa batch terakhir yang mungkin belum selesai
    if (promises.length > 0) {
        await Promise.all(promises);
    }

    console.log(`Selesai! Berhasil menarik ${allFetchedData.length} data.`);
    return allFetchedData;
}

// --- BTN PRINT ---
document.getElementById('btnPrint').addEventListener('click', async function() {
    const btn = this;
    btn.disabled = true;
    btn.innerText = "Mengambil semua data...";
    
    // Ambil SEMUA data dari Supabase (concurrent chunking)
    const fullData = await fetchAllDataConcurrently();
    
    btn.disabled = false;
    btn.innerText = "Print Seluruh Data";
    
    if (fullData === null) return; // Error sudah di-handle di fungsi
    
    if (fullData.length === 0) {
        alert("Tidak ada data untuk diprint.");
        return;
    }

    let printWindow = window.open('', '_blank');
    
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
                ${fullData.map((row, i) => {
                    let isSelesai = row['keterangan'] && row['keterangan'].toLowerCase() === 'selesai';
                    return `
                    <tr class="${isSelesai ? 'row-hijau' : ''}">
                        <td style="text-align: center;"><b>${i + 1}</b></td>${headers.map(h => `<td>${row[h] !== undefined ? row[h] : ''}</td>`).join('')}
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        <script>
            window.onload = function() {
                window.print();
            };
        </script>
    </body>
    </html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
});
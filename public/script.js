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

// Daftar kolom disesuaikan persis dengan SQL definition (tanpa id dan created_at)
const DB_COLUMNS = [
    'kelurahan', 'nomor_hak', 'surat_ukur', 'nib', 'luas', 
    'produk', 'luas_peta', 'validator_tekstual', 'validator_peta', 
    'blokir_internal', 'kw', 'pemilik_pertama', 'pemilik_akhir', 
    'tipe_hak', 'keterangan'
];

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
async function sendToBackendInChunks(dataArray, chunkSize = 10000) {
    if (!dataArray || dataArray.length === 0) return;

    let successCount = 0;
    const totalChunks = Math.ceil(dataArray.length / chunkSize);
    
    // Tampilkan indikator progres di UI
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = "block";
    loadingIndicator.innerText = `Mengunggah 0 / ${dataArray.length} baris ke server...`;
    
    // Kunci tombol input file agar user tidak melakukan aksi dobel
    const uploadMain = document.getElementById('fileUploadMain');
    const uploadDone = document.getElementById('fileUploadDone');
    uploadMain.disabled = true;
    uploadDone.disabled = true;

    // Looping SECARA SEKUENSIAL (Satu per satu) untuk menjamin urutan ID di database
    for (let i = 0; i < totalChunks; i++) {
        const from = i * chunkSize;
        const chunk = dataArray.slice(from, from + chunkSize);
        console.log(`Mengirim batch baris ${from + 1} hingga ${from + chunk.length}...`);
        
        // PENTING: Gunakan 'await' langsung di sini.
        // Server akan memproses dan mengurutkan ID batch ini sebelum lanjut ke batch berikutnya.
        const { error } = await supabaseClient
            .from(TABLE_NAME)
            .upsert(chunk, { onConflict: 'kelurahan,nomor_hak,surat_ukur,nib,luas,produk,luas_peta,validator_tekstual,validator_peta,blokir_internal,kw,pemilik_pertama,pemilik_akhir,tipe_hak' });

        if (error) {
            console.error(`Gagal pada batch ${from + 1}:`, error.message);
        } else {
            // Update jumlah sukses
            successCount += chunk.length;
        }
        
        // Update teks di layar untuk memberitahu user
        loadingIndicator.innerText = `Mengunggah ${successCount} / ${dataArray.length} baris ke server...`;
    }

    // Kembalikan UI ke kondisi semula
    loadingIndicator.style.display = "none";
    loadingIndicator.innerText = "Memuat data..."; // Kembalikan teks asli
    uploadMain.disabled = false;
    uploadDone.disabled = false;

    // Tampilkan notifikasi hasil
    alert(`Selesai! Berhasil menyimpan ${successCount} dari ${dataArray.length} baris ke database.`);
    
    // Perbarui jumlah data di antarmuka web
    fetchServerCounts();
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
        
        // Optimasi 1: Jangan gunakan select('*'). Spesifikasikan kolom untuk memangkas ukuran JSON.
        const selectQuery = 'id,' + DB_COLUMNS.join(',');
        
        let query = supabaseClient
            .from(TABLE_NAME)
            .select(selectQuery)
            .order('id', { ascending: true })
            .range(from, to);
            
        // Pencarian teks (tetap menggunakan skema Anda)
        if (currentSearchTerm !== "") {
            const orFilter = DB_COLUMNS.map(col => `${col}.ilike.%${currentSearchTerm}%`).join(',');
            query = query.or(orFilter);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (data && data.length > 0) {
            setupHeadersIfNeeded();
            
            // Optimasi 2: Langsung mutasi array alih-alih menyalin ulang seluruh array ribuan baris
            allData.push(...data);
            
            // Karena ini dari server yang sudah difilter oleh 'query.or()', 
            // filteredData bisa langsung di-assign referensinya atau ditambahkan langsung.
            if (currentSearchTerm !== "") {
                filteredData.push(...data);
            } else {
                filteredData = allData; // Hemat memori, gunakan referensi yang sama
            }
            
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
function setupHeadersIfNeeded() {
    if (headers.length === 0) {
        headers = [...DB_COLUMNS];
        
        let headerHtml = '<tr><th class="col-id">No ID</th>';
        headers.forEach(function(header) {
            let headerTitle = header.replace(/_/g, ' ').toUpperCase();
            headerHtml += `<th>${headerTitle}</th>`;
        });
        headerHtml += '</tr>';
        tableHead.innerHTML = headerHtml;
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

        setupHeadersIfNeeded();

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
        
        sendToBackendInChunks(cleanedNewData, 10000);
        
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

        setupHeadersIfNeeded();

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
        
        sendToBackendInChunks(cleanedNewData, 10000);
        
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

    // 1. Ambil total data terlebih dahulu
    const { count, error: countError } = await supabaseClient
        .from(TABLE_NAME)
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error("Gagal menghitung data", countError);
        alert("Gagal menghitung total data: " + countError.message);
        return null;
    }
    
    if (count === 0) return [];

    const totalPages = Math.ceil(count / limit);
    const maxConcurrent = 5; // Bisa dinaikkan (misal 5) karena aliran request sekarang non-blocking
    const pagedData = new Array(totalPages);
    let currentPage = 0;

    // 2. Eksplisit pilih kolom yang relevan saja untuk memangkas ukuran payload JSON (Opsional, tapi sangat disarankan)
    // DB_COLUMNS sudah dideklarasikan di awal script.js
    const selectQuery = 'id,' + DB_COLUMNS.join(',');

    // 3. Worker Function (Sliding Window)
    const fetchWorker = async () => {
        while (currentPage < totalPages) {
            // Ambil antrean halaman saat ini, lalu increment untuk worker lain
            const page = currentPage++; 
            const from = page * limit;
            const to = from + limit - 1;

            console.log(`Menarik data baris ${from + 1} sampai ${to + 1}...`);

            const { data, error } = await supabaseClient
                .from(TABLE_NAME)
                .select(selectQuery)
                .order('id', { ascending: true })
                .range(from, to);

            if (error) throw error;
            
            // Simpan di indeks yang sesuai agar data tetap terurut (Hal 1 -> Hal 2 -> dst)
            pagedData[page] = data; 
        }
    };

    // 4. Jalankan worker sejumlah batas maksimal konkurensi
    const workers = Array.from(
        { length: Math.min(maxConcurrent, totalPages) }, 
        () => fetchWorker()
    );

    try {
        await Promise.all(workers);
    } catch (error) {
        console.error("Terjadi kegagalan penarikan data paralel:", error);
        alert("Gagal mengekspor data: " + error.message);
        return null;
    }

    // 5. Gunakan method .flat() native JS yang jauh lebih cepat daripada looping push manual
    const allFetchedData = pagedData.flat();

    console.log(`Selesai! Berhasil menarik ${allFetchedData.length} data aktual sesuai urutan.`);
    return allFetchedData;
}

// --- BTN PRINT / EXPORT EXCEL ---
document.getElementById('btnPrint').addEventListener('click', async function() {
    const btn = this;
    const originalText = btn.innerText;
    
    // Ubah teks tombol saat loading
    btn.innerText = "Mengekspor... Mohon tunggu";
    btn.disabled = true;

    try {
        // 1. Tarik SELURUH data dari server menggunakan fungsi bawaan Anda
        const allExportData = await fetchAllDataConcurrently();

        if (!allExportData || allExportData.length === 0) {
            alert("Tidak ada data untuk diexport di database.");
            return;
        }

        // Pastikan DB_COLUMNS sudah ada (jika belum, kita deklarasikan ulang di dalam sini sebagai safety)
        const columns = [
            'kelurahan', 'nomor_hak', 'surat_ukur', 'nib', 'luas', 
            'produk', 'luas_peta', 'validator_tekstual', 'validator_peta', 
            'blokir_internal', 'kw', 'pemilik_pertama', 'pemilik_akhir', 
            'tipe_hak', 'keterangan'
        ];

        // 2. Menyusun ulang data agar rapi saat diubah ke Excel
        let dataToExport = allExportData.map((row, i) => {
            let rowData = { "NO": i + 1 }; // Tambah nomor urut di awal
            
            columns.forEach(h => {
                // Rapikan nama kolom (misal: "nomor_hak" -> "NOMOR HAK")
                let headerTitle = h.replace(/_/g, ' ').toUpperCase(); 
                
                // Masukkan data, jika null/undefined jadikan string kosong
                rowData[headerTitle] = row[h] !== undefined && row[h] !== null ? row[h] : '';
            });
            
            return rowData;
        });

        // 3. Mengonversi data JSON ke bentuk Worksheet Excel
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        // 4. Membuat Workbook baru dan memasukkan Worksheet ke dalamnya
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Cimahi");

        // 5. Memicu proses unduh file Excel
        XLSX.writeFile(workbook, "Data_Kwalitas_Cimahi.xlsx");

    } catch (error) {
        console.error("Gagal mengekspor data:", error);
        alert("Terjadi kesalahan saat mengekspor data.");
    } finally {
        // Kembalikan tombol ke keadaan semula
        btn.innerText = originalText;
        btn.disabled = false;
    }
});
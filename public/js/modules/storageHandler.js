import { uploadDwgFile, listDwgFiles, getPublicUrl } from './storage.js';
import { showProgress, updateProgress, hideProgress } from './progress.js';

export function initStorageHandlers() {
    const fileInputEl = document.getElementById('dwgFileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const statusDiv = document.getElementById('uploadStatus');
    const fileList = document.getElementById('dwgFileList');
    const dwgFileName = document.getElementById('dwgFileName');

    // Handle file selection
    if (fileInputEl) {
        fileInputEl.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const statusDiv = document.getElementById('uploadStatus');
            const dwgFileNameEl = document.getElementById('dwgFileName');
            if (file) {
                statusDiv.innerText = `File dipilih: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
                statusDiv.style.color = '#333';
                if (dwgFileNameEl) dwgFileNameEl.textContent = file.name;
            } else {
                statusDiv.innerText = '';
                if (dwgFileNameEl) dwgFileNameEl.textContent = 'No file chosen';
            }
        });
    }

    // Handle upload button click
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const fileInput = document.getElementById('dwgFileInput');
            const file = fileInput.files[0];
            const statusDiv = document.getElementById('uploadStatus');

            if (!file) {
                alert('Pilih file .dwg terlebih dahulu.');
                return;
            }

            // Validasi ekstensi
            if (!file.name.toLowerCase().endsWith('.dwg')) {
                alert('Format berkas tidak valid. Harap pilih file dengan ekstensi .dwg');
                return;
            }

            uploadBtn.disabled = true;
            showProgress("Mengunggah File DWG", 10, "Mengirim file ke Supabase Storage...");

            try {
                const { publicUrl, fileName } = await uploadDwgFile(file);

                statusDiv.innerText = `Sukses: ${file.name} berhasil diunggah`;
                statusDiv.style.color = 'green';
                if (fileInput) fileInput.value = '';

                // Refresh file list
                await loadFileList();
            } catch (err) {
                console.error(err);
                statusDiv.innerText = `Gagal: ${err.message}`;
                statusDiv.style.color = 'red';
            } finally {
                hideProgress();
                uploadBtn.disabled = false;
            }
        });
    }

    // Initial load of file list
    await loadFileList();
}

async function loadFileList() {
    const fileList = document.getElementById('dwgFileList');
    if (!fileList) return;

    try {
        const files = await listDwgFiles();
        fileList.innerHTML = '';

        if (!files || files.length === 0) {
            fileList.innerHTML = '<li style="color: #666; padding: 10px; text-align: center;">Belum ada file DWG yang diunggah</li>';
            return;
        }

        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.dwg')) {
                const publicUrl = getPublicUrl(`drawings/${file.name}`);
                const li = document.createElement('li');
                li.style.cssText = 'padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;';
                li.innerHTML = `
                    <span>${file.name} (${(file.metadata?.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <a href="${getPublicUrl(`drawings/${file.name}`)}" target="_blank" class="btn" style="padding: 5px 10px; font-size: 12px;">
                        Unduh
                    </a>
                `;
                fileList.appendChild(li);
            }
        }
    } catch (err) {
        console.error('Gagal memuat daftar file:', err);
    }
}

export { loadFileList };
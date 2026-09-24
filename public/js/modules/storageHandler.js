import { uploadDwgFile, listDwgFiles, getPublicUrl } from './storage.js';
import { showProgress, updateProgress, hideProgress } from './progress.js';

export async function initStorageHandlers() {
    const fileInputEl = document.getElementById('dwgFileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const dwgFileName = document.getElementById('dwgFileName');

    // Handle file selection
    if (fileInputEl) {
        fileInputEl.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const dwgFileNameEl = document.getElementById('dwgFileName');
            if (file) {
                if (dwgFileNameEl) dwgFileNameEl.textContent = file.name;
            } else {
                if (dwgFileNameEl) dwgFileNameEl.textContent = 'No file chosen';
            }
        });
    }

    // Handle upload button click
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async () => {
            const fileInput = document.getElementById('dwgFileInput');
            const file = fileInput.files[0];

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

                const dwgFileNameEl = document.getElementById('dwgFileName');
                if (dwgFileNameEl) dwgFileNameEl.textContent = file.name;
                if (fileInput) fileInput.value = '';

                hideProgress();
                const toast = document.getElementById('dwgUploadToast');
                if (toast) {
                    toast.innerHTML = `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>File <strong>${file.name}</strong> berhasil diupload ke database.</span>`;
                    toast.classList.remove('hidden');
                    setTimeout(() => toast.classList.add('hidden'), 10000);
                }

                await loadFileList();
            } catch (err) {
                console.error(err);
                hideProgress();
                alert('Gagal: ' + err.message);
            } finally {
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
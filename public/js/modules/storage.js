import { supabaseClient, BUCKET_NAME } from '../config/supabase.js';
import { showProgress, updateProgress, hideProgress } from './progress.js';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTENSIONS = ['.dwg'];

export async function uploadDwgFile(file, onProgress) {
    if (!file) throw new Error('File tidak dipilih');
    
    if (!file.name.toLowerCase().endsWith('.dwg')) {
        throw new Error('Format berkas tidak valid. Harap pilih file dengan ekstensi .dwg');
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Ukuran file melebihi batas maksimal 50 MB`);
    }

    // Sanitasi nama file dan tambahkan timestamp
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `drawings/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            contentType: 'application/acad',
            upsert: false
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseClient.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    return { path: filePath, publicUrl, fileName: file.name };
}

export async function listDwgFiles() {
    const { data, error } = await supabaseClient.storage
        .from(BUCKET_NAME)
        .list('drawings', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) throw error;
    return data || [];
}

export function getPublicUrl(path) {
    const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
}
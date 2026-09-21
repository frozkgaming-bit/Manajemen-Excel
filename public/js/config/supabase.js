export const SUPABASE_URL = 'https://pmoqzheinikyddkehbhd.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_3eeK9jTStOQM3JM3VP-VkA_swV4V3_b';
export const TABLE_NAME = 'kwalitas_data_cimahi';

export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const DB_COLUMNS = [
    'kelurahan', 'nomor_hak', 'surat_ukur', 'nib', 'luas', 
    'produk', 'luas_peta', 'validator_tekstual', 'validator_peta', 
    'blokir_internal', 'kw', 'pemilik_pertama', 'pemilik_akhir', 
    'tipe_hak', 'keterangan'
];

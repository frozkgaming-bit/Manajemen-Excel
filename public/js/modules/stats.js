import { supabaseClient, TABLE_NAME } from '../config/supabase.js';

export async function fetchServerCounts() {
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

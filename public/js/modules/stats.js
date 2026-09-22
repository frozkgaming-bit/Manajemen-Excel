import { supabaseClient, TABLE_NAME } from '../config/supabase.js';

export async function fetchServerCounts() {
    try {
        const { count: total, error: errTotal } = await supabaseClient
            .from(TABLE_NAME).select('*', { count: 'exact', head: true });
            
        const { count: selesai, error: errSelesai } = await supabaseClient
            .from(TABLE_NAME).select('*', { count: 'exact', head: true })
            .eq('keterangan', 'Selesai');
            
        if (errTotal || errSelesai) throw errTotal || errSelesai;

        const countTotal = document.getElementById('countTotal');
        const countSelesai = document.getElementById('countSelesai');
        const countBelum = document.getElementById('countBelum');

        if (countTotal) countTotal.textContent = total || 0;
        if (countSelesai) countSelesai.textContent = selesai || 0;
        if (countBelum) countBelum.textContent = (total - selesai) || 0;
    } catch (error) {
        console.error("Gagal mengambil jumlah data:", error);
    }
}
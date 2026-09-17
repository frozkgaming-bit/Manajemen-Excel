// api/get-counts.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Metode tidak diizinkan' });
    }

    try {
        // 1. Hitung Semua Data
        const { count: totalCount, error: errTotal } = await supabase
            .from('kwalitas_data_cimahi')
            .select('*', { count: 'exact', head: true });

        if (errTotal) throw errTotal;

        // 2. Hitung Data yang "Selesai"
        const { count: selesaiCount, error: errSelesai } = await supabase
            .from('kwalitas_data_cimahi')
            .select('*', { count: 'exact', head: true })
            .eq('keterangan', 'Selesai');

        if (errSelesai) throw errSelesai;

        // 3. Hitung Data yang "Belum Selesai"
        const belumCount = totalCount - selesaiCount;

        return res.status(200).json({
            success: true,
            total: totalCount || 0,
            selesai: selesaiCount || 0,
            belum: belumCount || 0
        });
    } catch (error) {
        console.error("Error get counts:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};
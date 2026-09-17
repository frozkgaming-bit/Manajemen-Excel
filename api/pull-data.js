// api/pull-data.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Metode tidak diizinkan' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search ? req.query.search.trim() : '';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
        let query = supabase
            .from('kwalitas_data_cimahi')
            .select('*', { count: 'exact' });

        if (search) {
            // Daftar kolom yang bertipe text sesuai skema tabel (tanpa id dan created_at)
            const searchableColumns = [
                'kelurahan',
                'nomor_hak',
                'surat_ukur',
                'nib',
                'luas',
                'produk',
                'luas_peta',
                'validator_tekstual',
                'validator_peta',
                'blokir_internal',
                'kw',
                'pemilik_pertama',
                'pemilik_akhir',
                'tipe_hak',
                'keterangan'
            ];

            // Menyusun format: kolom1.ilike.%kata%,kolom2.ilike.%kata%
            const orFilter = searchableColumns
                .map(col => `${col}.ilike.%${search}%`)
                .join(',');

            query = query.or(orFilter);
        }

        const { data, error, count } = await query
            .order('id', { ascending: true }) // Pastikan urutan konsisten saat dipaginasi
            .range(from, to);

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            data: data || [],
            count: count || 0,
            page,
            limit
        });
    } catch (error) {
        console.error("Error query Supabase:", error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};
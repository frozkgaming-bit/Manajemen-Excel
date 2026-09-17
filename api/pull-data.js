const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).json({ success: false });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
        const { data, error, count } = await supabase
            .from('kwalitas_data_cimahi')
            .select('*', { count: 'exact' })
            .range(from, to);

        if (error) throw error;

        return res.status(200).json({ success: true, data, count, page, limit });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
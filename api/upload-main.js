import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dataList } = req.body;
    const formattedData = dataList.map(item => ({
      ...item,
      Keterangan: "Belum Selesai" // Label status awal [cite: 2]
    }));

    const { data, error } = await supabase
      .from('kwalitas_data_cimahi')
      .insert(formattedData);

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Data utama berhasil disimpan', data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
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
      Keterangan: "Selesai" // Label status selesai [cite: 2]
    }));

    // Upsert sensitif terhadap 14 field (kecuali id & Keterangan) [cite: 1]
    const { data, error } = await supabase
      .from('kwalitas_data_cimahi')
      .upsert(formattedData, {
        onConflict: 'Kelurahan,Nomor_Hak,Surat_Ukur,NIB,Luas,Produk,Luas_Peta,Validator_Tekstual,Validator_Peta,Blokir_Internal,KW,Pemilik_Pertama,Pemilik_Akhir,Tipe_Hak',
        ignoreDuplicates: false // Timpa (update) jika seluruh field cocok, insert jika ada yang beda [cite: 1]
      });

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Data selesai diproses via upsert', data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
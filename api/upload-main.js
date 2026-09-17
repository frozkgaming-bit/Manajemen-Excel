import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dataList } = req.body;
    const formattedData = dataList.map(item => ({
      ...item,
      keterangan: "Belum Selesai" // Pastikan menggunakan huruf kecil jika tabel Supabase Anda huruf kecil
    }));

    // UBAH DARI .insert() MENJADI .upsert()
    const { data, error } = await supabase
      .from('kwalitas_data_cimahi')
      .upsert(formattedData, {
        // Pastikan nama kolom di bawah ini sesuai dengan huruf besar/kecil di tabel Supabase Anda
        onConflict: 'kelurahan,nomor_hak,surat_ukur,nib,luas,produk,luas_peta,validator_tekstual,validator_peta,blokir_internal,kw,pemilik_pertama,pemilik_akhir,tipe_hak',
        ignoreDuplicates: true // PENTING: Set true agar sistem sekadar melewati data yang sudah ada (skip)
      });

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Data utama berhasil disimpan', data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
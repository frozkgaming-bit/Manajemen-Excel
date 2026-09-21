# Manajemen Excel BOS EDS
Aplikasi manajemen dan pengolah data Excel statis (Frontend-only) menggunakan Vanilla JavaScript dan Supabase.

## Fitur
- Upload dan parsing data Excel (.xlsx) langsung di browser via SheetJS.
- Simpan data secara batch ke database Supabase (PostgreSQL).
- Tarik, cari, filter, dan ekspor data ke format Excel.

## Struktur Proyek
- `public/`: Direktori utama antarmuka frontend (HTML/CSS/JS).
- `vercel.json`: Konfigurasi deployment statis Vercel.

## Deployment
Karena ini adalah proyek statis murni, cukup jalankan menggunakan Live Server atau deploy folder ini langsung ke Vercel/Netlify.
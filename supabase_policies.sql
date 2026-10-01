-- Jalankan script ini di Supabase Dashboard > SQL Editor.
-- Policy ini diperlukan karena aplikasi memakai Supabase anon key di browser.

alter table public.kwalitas_data_cimahi enable row level security;

drop policy if exists "authenticated users can read kwalitas data"
    on public.kwalitas_data_cimahi;
drop policy if exists "authenticated users can insert kwalitas data"
    on public.kwalitas_data_cimahi;
drop policy if exists "authenticated users can update kwalitas data"
    on public.kwalitas_data_cimahi;

create policy "authenticated users can read kwalitas data"
    on public.kwalitas_data_cimahi
    for select
    to authenticated
    using (true);

create policy "authenticated users can insert kwalitas data"
    on public.kwalitas_data_cimahi
    for insert
    to authenticated
    with check (true);

create policy "authenticated users can update kwalitas data"
    on public.kwalitas_data_cimahi
    for update
    to authenticated
    using (true)
    with check (true);

-- Unique index untuk ON CONFLICT client-side upsert.
-- Conflict key = identifier properti SAJA (bukan kolom mutable),
-- supaya update data (luas, produk, dll) tetap match baris lama
-- alih-alih INSERT baris duplikat.
-- NULLS NOT DISTINCT: NULL di identifier match NULL lain (PG15+).
drop index if exists uq_kwalitas_data_cimahi_natural_key;

create unique index if not exists uq_kwalitas_data_cimahi_identifier
    on public.kwalitas_data_cimahi
    (kelurahan, nomor_hak, surat_ukur, nib)
    nulls not distinct;

-- Trigger: pertahankan keterangan 'Selesai' saat upsert Excel menimpa baris
-- yang sudah Selesai. Memicu jika keterangan berubah DAN minimal satu kolom
-- data ikut berubah (pola upsert). Update checkbox UI hanya mengubah
-- keterangan → kolom data tidak berubah → tetap diperbolehkan.
create or replace function public.preserve_selesai_keterangan()
returns trigger
language plpgsql
as $$
begin
    if old.keterangan = 'Selesai' and new.keterangan is distinct from old.keterangan then
        if (new.kelurahan is distinct from old.kelurahan)
            or (new.nomor_hak is distinct from old.nomor_hak)
            or (new.surat_ukur is distinct from old.surat_ukur)
            or (new.nib is distinct from old.nib)
            or (new.luas is distinct from old.luas)
            or (new.produk is distinct from old.produk)
            or (new.luas_peta is distinct from old.luas_peta)
            or (new.validator_tekstual is distinct from old.validator_tekstual)
            or (new.validator_peta is distinct from old.validator_peta)
            or (new.blokir_internal is distinct from old.blokir_internal)
            or (new.kw is distinct from old.kw)
            or (new.pemilik_pertama is distinct from old.pemilik_pertama)
            or (new.pemilik_akhir is distinct from old.pemilik_akhir)
            or (new.tipe_hak is distinct from old.tipe_hak)
        then
            new.keterangan = old.keterangan;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_preserve_selesai on public.kwalitas_data_cimahi;
create trigger trg_preserve_selesai
    before update on public.kwalitas_data_cimahi
    for each row
    execute function public.preserve_selesai_keterangan();

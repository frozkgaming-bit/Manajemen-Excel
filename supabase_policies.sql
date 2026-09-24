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

-- Supabase Storage buckets for v0
--
-- branding/    public  — CDL logos
-- merchants/   public  — merchant photos
-- qr-posters/  private — accessed via signed URLs

insert into storage.buckets (id, name, public)
values
  ('branding', 'branding', true),
  ('merchants', 'merchants', true),
  ('qr-posters', 'qr-posters', false)
on conflict (id) do nothing;

-- Public read for branding + merchants -----------------------------------------

drop policy if exists "branding_read" on storage.objects;
create policy "branding_read"
on storage.objects
for select
to public
using (bucket_id = 'branding');

drop policy if exists "merchants_read" on storage.objects;
create policy "merchants_read"
on storage.objects
for select
to public
using (bucket_id = 'merchants');

-- Authenticated writes for branding (admins only via service role server-side)
-- We rely on service role bypass for all writes from server actions.

-- qr-posters: NO public read; signed URLs only. Default deny is in effect via RLS.

-- updated_at trigger ----------------------------------------------------------

create or replace function public.set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'associations','merchants','campaign_templates','campaigns',
    'admins','users','participations','redemption_codes','whatsapp_messages'
  ]) loop
    execute format('drop trigger if exists set_updated_at on %I', t);
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

-- Helpers reading from JWT app_metadata ---------------------------------------

create or replace function public.jwt_role() returns text
  language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

create or replace function public.jwt_association_id() returns text
  language sql stable as $$
  select auth.jwt() -> 'app_metadata' ->> 'association_id'
$$;

create or replace function public.jwt_merchant_id() returns text
  language sql stable as $$
  select auth.jwt() -> 'app_metadata' ->> 'merchant_id'
$$;

create or replace function public.is_super_admin() returns boolean
  language sql stable as $$
  select public.jwt_role() = 'super_admin'
$$;

create or replace function public.is_association_member(target_association uuid) returns boolean
  language sql stable as $$
  select
    public.is_super_admin()
    or (
      public.jwt_role() in ('association_admin','merchant_admin')
      and target_association::text = public.jwt_association_id()
    )
$$;

-- RLS: enable + drop existing policies -----------------------------------------

alter table associations         enable row level security;
alter table merchants            enable row level security;
alter table campaign_templates   enable row level security;
alter table campaigns            enable row level security;
alter table campaign_merchants   enable row level security;
alter table admins               enable row level security;
alter table users                enable row level security;
alter table participations       enable row level security;
alter table events               enable row level security;
alter table redemption_codes     enable row level security;
alter table whatsapp_messages    enable row level security;

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- associations: a tenant member can read its own row; only super_admin writes.
create policy "associations_read"
on associations for select to authenticated
using (public.is_super_admin() or id::text = public.jwt_association_id());

create policy "associations_write"
on associations for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- merchants: scoped by association; merchant_admin sees only its own row.
create policy "merchants_tenant"
on merchants for all to authenticated
using (
  public.is_super_admin()
  or (public.jwt_role() = 'association_admin'
      and association_id::text = public.jwt_association_id())
  or (public.jwt_role() = 'merchant_admin'
      and association_id::text = public.jwt_association_id()
      and id::text = public.jwt_merchant_id())
)
with check (
  public.is_super_admin()
  or (public.jwt_role() = 'association_admin'
      and association_id::text = public.jwt_association_id())
  or (public.jwt_role() = 'merchant_admin'
      and association_id::text = public.jwt_association_id()
      and id::text = public.jwt_merchant_id())
);

-- campaign_templates: world-readable; only super_admin writes.
create policy "campaign_templates_read" on campaign_templates for select to authenticated using (true);
create policy "campaign_templates_read_anon" on campaign_templates for select to anon using (true);
create policy "campaign_templates_write" on campaign_templates for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

-- campaigns: tenant-scoped.
create policy "campaigns_tenant"
on campaigns for all to authenticated
using (public.is_association_member(association_id))
with check (public.is_association_member(association_id));

-- campaign_merchants: scoped via parent campaign.
create policy "campaign_merchants_tenant"
on campaign_merchants for all to authenticated
using (
  exists (
    select 1 from campaigns c
    where c.id = campaign_merchants.campaign_id
    and public.is_association_member(c.association_id)
  )
)
with check (
  exists (
    select 1 from campaigns c
    where c.id = campaign_merchants.campaign_id
    and public.is_association_member(c.association_id)
  )
);

-- admins: visible to peers within the tenant; super_admin sees all.
create policy "admins_tenant"
on admins for all to authenticated
using (
  public.is_super_admin()
  or (association_id is not null
      and association_id::text = public.jwt_association_id())
)
with check (
  public.is_super_admin()
  or (association_id is not null
      and association_id::text = public.jwt_association_id())
);

-- users: platform-level. Each user reads/updates only their own row.
-- Admins do not query users directly — only via joins on participations.
create policy "users_self"
on users for select to authenticated
using (id = auth.uid());

create policy "users_self_update"
on users for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- participations: tenant-scoped for admins; consumers see their own.
create policy "participations_tenant"
on participations for all to authenticated
using (
  public.is_association_member(association_id)
  or user_id = auth.uid()
)
with check (
  public.is_association_member(association_id)
  or user_id = auth.uid()
);

-- events: append-only. Reads scoped by tenant (or own user_id).
-- Inserts go through service role from API routes — RLS denies all writes here.
create policy "events_read"
on events for select to authenticated
using (
  public.is_association_member(association_id)
  or user_id = auth.uid()
);

-- redemption_codes: tenant-scoped + own.
create policy "redemption_codes_tenant"
on redemption_codes for all to authenticated
using (
  public.is_association_member(association_id)
  or user_id = auth.uid()
)
with check (
  public.is_association_member(association_id)
  or user_id = auth.uid()
);

-- whatsapp_messages: tenant-scoped (audit log).
create policy "whatsapp_messages_tenant"
on whatsapp_messages for select to authenticated
using (
  public.is_super_admin()
  or (association_id is not null
      and association_id::text = public.jwt_association_id())
);

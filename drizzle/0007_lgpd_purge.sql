-- LGPD soft-delete purge.
-- Hard-deletes users (and cascades) whose deleted_at is older than 30 days.
-- Schedule via Supabase Cron (pg_cron) when ready:
--   select cron.schedule('lgpd-purge', '0 3 * * *', $$select public.lgpd_purge_users();$$);

create or replace function public.lgpd_purge_users()
returns integer
language plpgsql
security definer
as $$
declare
  affected integer;
begin
  delete from users
  where deleted_at is not null
    and deleted_at < now() - interval '30 days';
  get diagnostics affected = row_count;
  return affected;
end;
$$;

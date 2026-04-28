-- Sorteio: one entry per (user, merchant, day) per the visit-based v0 (ADR-015)
create unique index if not exists events_entry_uq
  on events (user_id, merchant_id, ((created_at at time zone 'UTC')::date))
  where type = 'entry_recorded' and user_id is not null;

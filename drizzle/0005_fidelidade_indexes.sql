-- Cartão Fidelidade: one visit per (user, merchant, day)
create unique index if not exists events_visit_uq
  on events (user_id, merchant_id, ((created_at at time zone 'UTC')::date))
  where type = 'visit_recorded' and user_id is not null;

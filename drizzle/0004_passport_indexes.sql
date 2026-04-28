-- Partial unique indexes that encode per-template idempotency (ADR-010).

create unique index if not exists events_passport_uq
  on events (participation_id, merchant_id)
  where type = 'stamp_granted' and participation_id is not null;

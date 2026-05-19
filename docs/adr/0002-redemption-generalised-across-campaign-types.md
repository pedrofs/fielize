# Redemption is one model, generalised across LoyaltyCampaign and OrganizationCampaign

A Redemption records a Customer claiming a Prize they're entitled to. The *precondition* differs between the two campaign types — Loyalty requires hitting a threshold at a Merchant; OrganizationCampaign requires winning a Raffle — but the act itself (Customer + Campaign + Prize, validated by a User, at a point in time) is the same. We use a single `redemptions` table with type-specific nullables and per-type validation, rather than a parallel `RaffleRedemption` model.

## Why

- **The physical event is the same.** A Customer presents their identity, a staff User confirms entitlement, the Prize moves. Splitting the model would duplicate that shape.
- **Merchant-side UX unifies.** Merchants validating Loyalty redemptions and Org staff marking raffle deliveries see the same record type, listed and queried the same way.
- **Migration cost.** One nullable column for `merchant_id`, one for `raffle_id`, one for `threshold_snapshot` is far cheaper than a second table that diverges over time.

## Schema shape

`Redemption` carries `customer_id`, `campaign_id`, `prize_id`, `redeemed_by_user_id` (the validator — was `merchant_user_id`), plus the nullables:

- `merchant_id`, `threshold_snapshot` — required for `LoyaltyCampaign`, blank for `OrganizationCampaign`
- `raffle_id` — required for `OrganizationCampaign`, blank for `LoyaltyCampaign`

Enforced by per-type validation (mirrors the existing `loyalty_specific_rules` pattern on the model).

## Considered alternative

A separate `RaffleRedemption` model parallel to `Redemption`. Rejected because the two "redemptions" are the same domain event with different preconditions — splitting them puts the burden of "list everything this Customer has claimed" on a UNION query for no real benefit.

## Surprise to flag

A future reader scanning the schema will see three nullable columns on `redemptions` and reasonably wonder why. The answer is: one model, two entitlement paths. The model's per-type validation is where that's enforced.

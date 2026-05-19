# Raffle is scoped per-Prize, not per-Campaign

An OrganizationCampaign ends with a draw that picks a winning Customer for each Prize. We model this as one `Raffle` row per `Prize` (so `prize.raffle.winner` is the natural reference) rather than one `Raffle` row per `Campaign` with many `Winner` join rows.

## Why

- **Cumulative entry pools are genuinely per-Prize.** A Customer who has stamped 8 distinct merchants is in the eligible pool for the Prize-at-3, the Prize-at-5, *and* the Prize-at-8 — these are three different draws over three different populations. Per-Prize `Raffle` makes that the natural unit; a per-Campaign `Raffle` would have to encode "pool per Prize" inside the Winners table anyway.
- **Redemption is per-Prize.** Customers redeem a specific Prize at the Organization. The winner reference belongs on the thing being claimed (the Prize's Raffle), not buried in a campaign-wide Winners join.
- **Failure modes are per-Prize.** Empty pool, no-show forfeit, redraw — all operate on a single Prize's draw. `prize.raffle.expire!` reads cleaner than walking a Winners collection.

## Considered alternative

`Raffle` scoped per-Campaign, with `has_many :winners` (each Winner ties one Prize to one Customer). This buys a single "the campaign's draw happened at time T with seed S" record, but `prizes.map(&:raffle).map(&:drawn_at)` covers the same need, and the per-Prize semantics above outweigh the centralisation.

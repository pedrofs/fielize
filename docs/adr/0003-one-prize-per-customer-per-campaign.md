# A Customer wins at most one Prize per Campaign

When an OrganizationCampaign's Raffles are drawn, a Customer drawn for one Prize is excluded from the entry pools of the remaining Raffles in the same Campaign. Draws run in `Prize.position` order, so the first Prize listed has the broadest pool; subsequent draws skip already-winning Customers.

## Why

- **Matches participant expectations.** "We drew you, you won, sit down" is how raffles read to lay observers. Awarding the same person two Prizes from one Campaign feels like a bug, even when statistically defensible.
- **Spreads engagement.** Loyalty platform goal is broad participation across many Customers. Letting one lucky Customer sweep multiple Prizes undermines that.
- **Gives draw order meaning.** Without the constraint, draws are independent — order is irrelevant. With it, position matters: the org user controls "what gets drawn first from the broadest pool" by ordering Prizes in the form.
- **Cumulative falls out naturally.** A Customer who crossed three thresholds (Prize-3, Prize-5, Prize-8) is eligible for all three. Without the constraint they could win all three; with it, they get *a* prize from among the ones they qualified for — which is the spirit of cumulative tiers.

## Considered alternatives

- **Unlimited wins (independent draws per Prize).** Simpler to implement and statistically pure, but a lucky Customer can sweep the Campaign. Rejected for the engagement-spread reason.
- **One Prize per Customer per tier (cumulative).** Letting a Customer win once per threshold-band but not across bands. Too clever for the value gained, and `simple` campaigns would need a different rule.

## Consequences

- `Prize.position` becomes load-bearing — it's the draw order, not just visual order.
- `RaffleEntry` rows need a way to indicate "this Customer is no longer eligible because they won Prize X earlier in this draw run". Implementation: the draw orchestrator excludes by `customer_id` from the pool before materialising entries for each subsequent Prize.
- Replaying a draw means replaying it in `Prize.position` order with the same seed and the same exclusion logic — the order is part of the algorithm, not metadata.

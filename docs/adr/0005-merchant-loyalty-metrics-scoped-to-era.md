# Merchant loyalty dashboard metrics are scoped to the current balance era

The "Cartão Fidelidade" dashboard (the merchant-side `LoyaltyCampaign` page) computes every aggregate — the cumulative funnel (Inscritos → Carimbaram → Resgataram), the recent-activity block, and the redeemable / "quase lá" actionable lists — over the **current era only**, i.e. `created_at > effective_from_at`. A `disable!(reset: true)` advances `effective_from_at` and therefore visibly resets the whole dashboard, exactly as it already zeroes every Customer's `balance_for`. A rolling 7/15/30d window overlays *within* the era for the recent-activity block; the era remains the floor (including the "prior Stamp" lookback that classifies a returning Customer).

## Why

The actionable lists derive from `balance_for`, which is already era-scoped — so scoping the rest to match keeps every number on the page reconcilable with the balances shown beside it. A reset is a deliberate "start over," and the dashboard starting over with it is the intuitive reading of "is this program working *now*." For the ~all merchants who never reset (`effective_from_at` is `nil`), this is identical to all-time.

## Considered alternatives

- **All-time, counting across resets.** Richer "total history," but the funnel's denominators would no longer reconcile with the spend-down balances rendered alongside them, and a reset would visibly reset nothing — confusing. Rejected.

## Consequences

- `effective_from_at` becomes load-bearing for reporting, not just for `balance_for`. Any new metric added to this page must filter on it.
- A merchant who resets loses dashboard visibility into the prior era by design; recovering it later is an explicit, separate "historical view" feature, out of scope.

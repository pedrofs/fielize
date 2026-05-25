# The merchant loyalty dashboard is read-only

The "Cartão Fidelidade" dashboard surfaces which Customers can redeem now ("Pode resgatar agora") and which are close ("Quase lá"), but exposes **no action on those lists** — no merchant-initiated WhatsApp reminder, no send button. The page is a single render with no new write paths; the existing setup writes (add Prize, activate) and the existing staff-initiated Redemption flow are unchanged.

This is the merchant-side parallel of [ADR-0004](./0004-customer-app-does-not-initiate-redemption.md): just as the customer Wallet surfaces redemption-readiness without transacting, the merchant dashboard surfaces it without messaging.

## Why

A merchant-initiated reminder is a feature unto itself, not a dashboard affordance: it needs a new outbound WhatsApp template, an LGPD/consent answer (Enrollment opt-in does not obviously cover merchant marketing reminders), plus per-Customer send actions, rate-limiting, and "already nudged" state. Keeping v1 read-only ships the analytics value without that weight or its abuse surface.

## Consequences

- The absence of a "lembrar" / nudge button on the redeemable and "quase lá" lists is **deliberate** — a future engineer should not treat it as an oversight.
- If we later add merchant-initiated reminders, it is an additive follow-on (a write path + consent model), not a redesign of this page.

# Decisions Log — Painel Vizinho

> A chronological log of major architectural decisions with the reasoning behind each. When you find yourself questioning a constraint, look here first — it has probably been re-litigated already.

---

## ADR-001: Multi-tenant from day one

**Decision:** every domain table carries `association_id`. RLS-based isolation enforced at the database. Subdomain-based routing maps the request hostname to a tenant.

**Reasoning:** even with one customer (CDL Jaguarão), retrofitting multi-tenancy later is expensive. Cost of having it now is small (RLS adds ~30 min per table); cost of adding later is on the order of 4–6 weeks plus production data migration risk.

**Alternative considered:** single-tenant for v0, "we'll multi-tenant when we have customer #2." Rejected — the business case explicitly targets ~1,200 CDLs nationally; multi-tenancy is not optional.

---

## ADR-002: Platform-level user identity (the Stripe model)

**Decision:** `users` table has no `association_id`. One phone = one account across all CDLs. Engagement (`participations`, `events`) is tenant-scoped.

**Reasoning:** unlocks future cross-CDL value (one account, unified history, regional consumer-facing product). Doesn't compromise tenant isolation because each CDL only sees engagement that occurred within it. Aligns the product with how Stripe, Foursquare, and Eventbrite work.

**Tradeoff:** introduces co-controllership under LGPD (platform is controller for account data; CDL is controller for campaign data). Acceptable — this is standard for modern SaaS.

**Alternative considered:** fully tenant-scoped users. Rejected — would prevent the cross-CDL "wider possibilities" the founder explicitly wants, and would force consumers to identify multiple times across CDLs.

---

## ADR-003: Customer-scan-only

**Decision:** the merchant never scans the customer's phone. Customers scan a static QR poster at the merchant's counter. Merchants don't need a smartphone, app, or login to record visits.

**Reasoning:** the previous paper-based campaign at CDL Jaguarão succeeded on supply (50% merchant adoption) but failed on demand. The single biggest factor we can control on the merchant side is *zero requirement*. Asking merchants to install an app or log in to scan customer phones is a cliff that kills adoption.

**Alternative considered:** merchant-scan-customer-phone as primary flow with M-06-style fallback. Rejected — adds operational burden on the merchant for marginal fraud reduction. We layer anti-fraud defenses instead.

---

## ADR-004: One QR per store, not per campaign

**Decision:** a single QR code at the merchant's counter serves all active campaigns at that merchant. The scan endpoint enrolls the customer in eligible campaigns and registers visits/stamps/entries across all of them in one shot.

**Reasoning:** operational simplicity. Merchants print one poster and never reprint when campaigns change. CDL admins can launch new campaigns without coordinating poster swaps with 50 merchants.

**Alternative considered:** one QR per campaign. Rejected — too much operational coordination cost, and customers would have to scan multiple QRs at the same store to cover multiple campaigns.

---

## ADR-005: Identification captured early, not deferred

**Decision:** `C-00 Store Landing` shows the campaigns AND captures WhatsApp inline. Magic link confirmation completes identification before the customer leaves the page.

**Reasoning:** the founder explicitly prioritizes lead capture. The previous paper campaign failed in part because it captured no contacts. A tourist who scans 4 stores anonymously and never identifies is a lead lost forever. Having identification on the first useful screen is a deliberate trade of friction for capture rate.

**Alternative considered:** deferred identification (anonymous stamp accumulation, identify only when claiming the reward). Rejected — preserves friction at the cost of capture, and contradicts the strategic framing that the contact list is the platform's most valuable output.

---

## ADR-006: Cartão Fidelidade is merchant-activated

**Decision:** when a merchant joins the CDL/platform, they do NOT automatically get a Cartão Fidelidade program. They configure threshold, prize, validation, and renewal in screen `M-07` and explicitly activate.

**Reasoning:** Cartão Fidelidade is a contract between the merchant and their customers. Auto-provisioning would create programs the merchant doesn't actually want to honor. The platform shouldn't pretend to commit a merchant's prize on their behalf.

**Strategic side effect:** activating Cartão Fidelidade becomes a recurring engagement reason for merchants to value the platform. It positions the platform as a *retention reason* for CDL membership, addressing the SPC commoditization gap.

---

## ADR-007: Reward validation is configurable per campaign, not per template

**Decision:** two flags on the campaign config:
- `reward_type`: `raffle` | `individual`
- `requires_merchant_validation_on_redemption`: bool
- `requires_validation_on_check_in`: bool (rarely true)

Logic at runtime decides whether redemption requires merchant validation via `M-06`, or self-attestation, or no per-customer redemption (raffle).

**Reasoning:** different campaigns have different stakes. A passport raffle has zero per-customer payout risk (one winner gets one prize). A Cartão Fidelidade with physical prize has direct merchant cost per redemption. A "10% off coupon" digital prize doesn't need merchant validation. Hardcoding a single behavior per template ties our hands; configuration per campaign keeps flexibility while letting templates have sensible defaults.

**Alternative considered:** hardcode "Cartão Fidelidade always requires validation, raffles never do." Rejected — kills future templates that don't fit the binary.

---

## ADR-008: Cartão Fidelidade overflow allowed (11/10, 12/10…)

**Decision:** customers continue accumulating visits past the threshold. On redemption, the system consumes N visits (the threshold) and the excess starts the next card.

**Reasoning:** prevents the awkward "you must redeem before continuing" moment. Tourists especially don't return on schedule — they may visit 11 times before remembering to redeem. Making them lose the 11th visit feels punitive.

**Implementation:** redemption transaction subtracts threshold from `participations.state.visits`. Remaining count starts the new cycle automatically.

---

## ADR-009: Reward redemption has no expiration

**Decision:** redemption codes for individual rewards (Cartão Fidelidade) are valid until redeemed or canceled. No countdown timer.

**Reasoning:** the customer earned the prize. Adding artificial scarcity creates anxiety and can result in the customer feeling cheated if they couldn't go to the store within the window. The merchant isn't harmed by a delayed redemption; the prize obligation is already on their books.

**Alternative considered:** 30-day expiration. Rejected as unnecessary complexity that creates customer friction without business benefit.

**Note:** check-in validation codes (`C-02`) DO expire (30 minutes). Different code class, different stakes.

---

## ADR-010: Idempotency keys vary per template

**Decision:**
- Passport: `(participation_id, merchant_id)` — one stamp per merchant per customer per campaign, forever.
- Cartão Fidelidade: `(user_id, merchant_id, day)` — one visit per day.
- Sorteio (visit-based): `(user_id, merchant_id, day)` — one entry per day per merchant; cap configurable.

**Reasoning:** different templates have different semantics. A passport explicitly cannot give two stamps for revisiting the same store. A loyalty card explicitly accumulates with revisits, but rate-limited to one per day to prevent abuse.

**Implementation:** unique constraints in the `events` table per relevant template. A single scan affecting multiple campaigns inserts one event per campaign, each respecting its own key.

---

## ADR-011: Layered anti-fraud, none alone bulletproof

**Decision:** five lightweight layers, each cheap, none alone sufficient:
1. Geolocation check (~80m radius from merchant lat/lng)
2. Rate limit per (phone, merchant)
3. Rotating session token
4. Merchant visibility feed in `M-03`
5. LGPD-stated penalty for fraud

**Reasoning:** the goal is to make cost of fraud > expected value of prize for the typical attacker. Not to prevent all fraud absolutely. Bulletproof anti-fraud at the customer-scan level would require either merchant-scan-customer (rejected per ADR-003) or biometric/POS integration (out of scope for v0).

**For high-stakes physical prizes (Cartão Fidelidade)**, merchant validation via `M-06` is the primary defense at redemption time. The layered defenses above protect during accumulation; merchant validation protects at payout.

---

## ADR-012: WhatsApp magic link, not SMS or email

**Decision:** identification flow uses WhatsApp Business API to send a magic link. Customer taps the link, identifies the session.

**Reasoning:** WhatsApp is the dominant communication channel in Brazil — far more universal than email and more reliable than SMS. Tourists from Uruguay are also heavy WhatsApp users (Uruguay has even higher WhatsApp penetration than Brazil). The platform is going to use WhatsApp anyway for transactional notifications, so identification through the same channel reduces total integrations.

**Tradeoff:** WhatsApp Business API requires Meta-approved templates (1–24h approval lead time) and per-message cost (~R$0.05–0.15 in BR). For v0 this cost is borne by the platform; renegotiated post-pilot.

**Alternative considered:** SMS as primary. Rejected — higher cost in BR, less reliable delivery, less universal among the tourist segment.

---

## ADR-013: Validation via web (no login) at /r/[storeId], not via merchant app

**Decision:** merchants validate redemption codes via a public web page at `/r/[storeId]`. No login. Save as home-screen icon for one-tap access.

**Reasoning:** consistent with ADR-003 (merchants need no app, no login). The URL is unique per store and includes a non-guessable component. Anti-fraud comes from: code validity check (server-side), rate limit per merchant, audit log.

**Alternative considered (option 1):** customer-only honor system, no merchant validation at all. Rejected — too risky for physical prizes; merchants would lose trust.

**Alternative considered (option 2):** WhatsApp message to merchant for validation. Rejected — adds Meta approval cost per merchant per redemption and depends on the merchant having WhatsApp open.

---

## ADR-014: PWA, not native app, for v0

**Decision:** mobile-first responsive web. No iOS / Android app.

**Reasoning:** native app adds App Store / Play Store friction for both customer (download) and operations (review, updates, multi-platform). PWA covers all use cases for v0 since we don't need push notifications (WhatsApp substitutes), camera access (browser handles QR scanning), or other native-only capabilities.

**Reconsideration trigger:** if engagement metrics show that returning customers underperform vs. industry benchmarks for loyalty apps, evaluate native app investment for v1+.

---

## ADR-015: Sorteio v0 is visit-based, not transaction-value-based

**Decision:** the third template (Sorteio / Compre & Ganhe) records one entry per merchant per day per customer. No transaction value tracked.

**Reasoning:** transaction-value-based requires merchant input at the counter (typing the purchase amount). This violates ADR-003 (zero merchant friction). Visit-based gives 80% of the campaign concept value at 0% of the merchant burden.

**Future:** v1 may add a transaction-value-based template with a merchant dashboard to enter purchase values. Re-evaluate when there is documented demand from at least 3 CDLs and merchants willing to do the data entry.

---

## ADR-016: Subdomain-per-CDL, with optional CNAME

**Decision:** each CDL gets `[slug].painelvizinho.com.br` by default. Premium tenants can configure their own domain via CNAME.

**Reasoning:** subdomain is the cleanest white-label signal — merchants and customers see "their CDL's" domain, not Painel Vizinho's. CNAME for premium gives the highest-budget CDLs full brand control. Vercel wildcard makes implementation trivial.

**Cost:** Vercel Pro plan ($20/mo) required for wildcard. Acceptable.

---

## ADR-017: Final product naming deferred

**Decision:** ship v0 with placeholder name "Painel Vizinho." Final naming chosen during or after pilot.

**Reasoning:** naming should be informed by pilot feedback (does the brand resonate with merchants/CDLs? does it sound credible?). Pre-naming risks rework. Placeholder is workable for the pilot since CDL branding dominates anyway — most users never see the platform brand prominently.

**Mitigation:** code uses `PLATFORM_NAME` env var rather than hardcoded strings. Single rename point when finalized.

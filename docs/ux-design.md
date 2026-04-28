# UX Design — Painel Vizinho v0

> Visual reference: see `wireframes.html` (the source of truth — every decision below is reflected there). This document captures the *reasoning* behind each design choice and details flows in textual form for agents that consume markdown.

---

## 1. Architecture in one paragraph

The platform follows the "Stripe model": consumer identity lives at the platform level (one phone = one account across all CDLs); the experience is white-labeled per CDL (logos, colors, copy). Merchants and admins see only their own data. Each merchant has one QR code at their counter that handles all active campaigns simultaneously. The scan endpoint enrolls the customer in eligible campaigns and registers a visit, stamp, or entry across all of them in a single action. Customer identification (WhatsApp) is captured on the first useful screen, not deferred — the value of having every lead's contact outweighs the friction.

---

## 2. Surfaces and who sees them

| Surface | Actor | Branding | Auth |
|---|---|---|---|
| Consumer | End customer (tourist, resident) | CDL-branded by context; only `C-06` is platform-branded | Magic link via WhatsApp; 90-day session |
| Merchant | Shop staff / shop owner | 100% CDL-branded | Magic link via SMS or WhatsApp; `M-06` is public no-login |
| CDL Admin | Diretor executivo / operadora | 100% CDL-branded | Email + password |
| Platform Super Admin | Pedro | Platform-branded | SSO or restricted email |

---

## 3. Personas

**Maria, 34, Montevideo.** Crosses the border to shop in Jaguarão. Wants prizes and discounts, hates filling forms. Medium digital literacy. WhatsApp is her default channel.

**Carla, 22, shop assistant at Calzados Ricardo.** Works the counter. We must require nothing of her — no app, no login, no training. The QR poster on the wall is her only touchpoint with the platform.

**Ricardo, 48, owner of Calzados Ricardo.** Wants to know if his association membership is paying off. Checks the dashboard once a week at most. Wants numbers, not charts. Activates and tweaks his own Cartão Fidelidade program.

**Sandra, 39, diretora executiva of CDL Jaguarão.** Runs multiple campaigns per year. Needs to spin up a new campaign in under 30 minutes solo. Needs a board-ready dashboard for her quarterly meetings.

---

## 4. Screen inventory

### Consumer
| ID | Screen | Purpose |
|---|---|---|
| C-00 | Store Landing | Primary entry point. Lists active campaigns at this store. Inline WhatsApp form. |
| C-02 | Validation Code | Conditional: shown when a campaign requires merchant validation at check-in. Customer shows a 6-digit code to the merchant. |
| C-03 | Awaiting WhatsApp confirmation | Warning state shown after C-00 submission while polling for confirmation. |
| C-03-1 | WhatsApp message | Mockup of the WhatsApp message arriving on the customer's phone. (Not a screen we render; documented for clarity.) |
| C-03-2 | Multi-campaign success | All updated campaigns shown with new progress. |
| C-05 | Reward Unlocked | Cartão Fidelidade reached threshold. Shows redemption code. **No expiration.** |
| C-06 | My Account | Cross-CDL view. Only platform-branded screen on consumer side. |

### Merchant
| ID | Screen | Purpose |
|---|---|---|
| M-01 | Onboarding | Confirms profile, hours, photo via magic link invitation |
| M-03 | Dashboard | Visits, ranking, pending redemptions, activity feed |
| M-04 | My Campaigns | Toggle opt-in/out per campaign |
| M-05 | QR Poster | Printable PDF — customer-facing QR + merchant-only access QR for `M-06` |
| M-06 | Validation | Public web (no login) at `/r/[storeId]`. Used for both redemptions and check-in validations. |
| M-07 | Cartão Fidelidade Config | Activate, set threshold, prize, validation requirement, renewal behavior |

### CDL Admin
| ID | Screen | Purpose |
|---|---|---|
| A-01 | Home | Active campaigns + KPIs |
| A-02 | Campaign List | Draft / live / ended |
| A-03 | Campaign Creator | Wizard for new campaigns |
| A-04 | Campaign Live Dashboard | Real-time funnel, heatmap, merchant ranking — **the political artifact** |
| A-05 | Campaign Closeout | End campaign + verifiable auto-draw + winner asset generation |
| A-06 | Merchant Directory | List + invitations |
| A-07 | Cross-Campaign View | Annual rollup for the board |
| A-08 | White-label Settings | Logo, colors, domain, WhatsApp templates |

### Platform (super-admin)
| ID | Screen | Purpose |
|---|---|---|
| P-01 | Tenants List | All CDLs |
| P-02 | Tenant Onboarding | Create + bootstrap a new CDL |
| P-03 | Cross-tenant Analytics | Platform health |

---

## 5. Customer journeys (textual)

### Journey 1: First-time identification

1. Customer scans the QR poster at Calzados Ricardo's counter.
2. URL is `cdljaguarao.painelvizinho.com.br/s/[storeId]`. Server resolves the store, lists the campaigns it participates in, validates browser geolocation (~80m radius), and creates an anonymous session token.
3. **C-00 Store Landing** renders: store info + 3 campaign cards (Pasaporte de Compras, Cartão Fidelidade Ricardo, Sorteio Black Friday) + inline WhatsApp form + LGPD opt-in checkbox.
4. Customer types phone, accepts LGPD, taps "Participate in 3 campaigns".
5. Server sends `cdl_optin_confirmation` template via WhatsApp. Customer's view advances to **C-03 Awaiting WhatsApp** — amber warning with polling indicator.
6. Customer's WhatsApp receives the message (this is **C-03-1** in the wireframes — included for handoff clarity, not a screen we render). Customer taps the magic link.
7. Magic link verifies a JWT; server marks the customer as identified; auto-enrolls in eligible campaigns; records the current scan as a visit/stamp/entry across all of them.
8. **(Conditional) C-02** appears if any active campaign at this store has `requires_validation_on_check_in = true`. Customer shows the 6-digit code to the merchant. Merchant validates via `M-06`. Server records the previously-pending check-in.
9. **C-03-2 Multi-campaign success** renders: all three campaigns updated, progress visible, "+1 stamp" / "+1 visit" / "+1 entry" badges.

### Journey 2: Returning customer

1. Customer scans a QR at a different store (e.g., Moda Río Branco). Server recognizes the JWT (90-day session).
2. Auto-enrolls in any new campaigns at that store. Records visit. Skips landing.
3. **C-03-2 Multi-campaign success** renders directly with a "welcome back" banner and "new" tags on freshly-enrolled campaigns.
4. If the visit completed a Pasaporte (e.g., 6/6), `cdl_passport_completed` template fires.

### Journey 3: Cartão Fidelidade redemption with overflow

1. Maria has accumulated **11 visits at Calzados Ricardo** (overflow allowed). Her **C-06 My Account** highlights the card with an "EXCEDENTE" badge and a "Redeem now" button.
2. She taps redeem. **C-05 Reward Unlocked** shows a 6-digit code, the prize description, and a "no-expiration" notice. The same code is sent via WhatsApp using `cdl_redemption_code` (so she has a copy to fall back on).
3. She walks to the store at her convenience. Ricardo (or staff) opens the **M-06** shortcut on his phone (saved as a home-screen icon during onboarding) and types the 6 digits.
4. Server validates: code exists, not yet redeemed, belongs to this store. **M-06 success** renders. Server consumes 10 of the 11 visits; the leftover 1 starts a new card cycle.
5. `cdl_redemption_done` fires to Maria via WhatsApp confirming the redemption and the new card status (1/10).

---

## 6. Per-template flow logic

### Passport (multi-merchant, raffle)
- **Reward type:** raffle. One winner drawn at campaign end via auto-draw with verifiable seed (SHA-256 of campaign_id + ends_at).
- **Idempotency key on stamp:** `(participation_id, merchant_id)` — one stamp per merchant per customer per campaign, forever.
- **Threshold:** configurable, default 6 stamps. On reaching threshold, customer is auto-entered in the raffle. No per-customer redemption.
- **Validation:** typically `requires_validation_on_check_in = false`.

### Cartão Fidelidade (single-merchant, individual reward, ongoing)
- **Reward type:** individual.
- **Idempotency key on visit:** `(user_id, merchant_id, day)` — one visit per day.
- **Threshold:** configurable per-merchant via `M-07`. Default 10.
- **Overflow:** customers may exceed threshold. On redemption, system consumes N visits; remainder starts the next card.
- **Validation:** `requires_merchant_validation = true` by default for physical prizes. Customer shows code on `C-05`; merchant validates via `M-06`.
- **Authorship:** activated by the merchant, not by the CDL admin.
- **Lifecycle:** always-on. No `ends_at`.

### Sorteio / Compre & Ganhe (visit-based, raffle)
- **Reward type:** raffle.
- **Idempotency key on entry:** `(user_id, merchant_id, day)` — one entry per merchant per day; cap configurable per campaign.
- **No threshold.** Every visit during the campaign window = 1 entry.
- **Validation:** typically `requires_validation_on_check_in = false`.
- **v0 limit:** visit-based only. Transaction-value-based version was deferred to v1 because it requires merchant input at the counter.

---

## 7. White-label configuration surface

| Item | Themable | Mechanism |
|---|---|---|
| CDL logo | yes | Upload in `A-08`; stored in Supabase Storage |
| Primary color | yes | Color picker; applied via CSS variable `--cdl-primary` |
| Accent color | yes | Color picker; applied via CSS variable `--cdl-accent` |
| Typography | not in v0 | System fonts. v1 may allow custom. |
| Domain | yes | Subdomain `[slug].painelvizinho.com.br` (default) or custom CNAME |
| WhatsApp template copy | yes (within Meta-approved structure) | Editor in `A-08` |
| QR poster template | choice of 3 fixed designs | Logo applied automatically |
| Footer attribution | locked | "Powered by Painel Vizinho" subtle but always present |

---

## 8. WhatsApp integration

WhatsApp Business API via Z-API or 360dialog. All transactional messages use Meta-approved templates (free-form messages only allowed within 24-hour customer-initiated window).

See `whatsapp-templates.md` for the full catalog with placeholders and triggering events.

Key constraints:
- Approval lead time 1–24h per template. Apply on day 1.
- Cost ~R$0.05–0.15 per message in BR; varies by category.
- Magic link tokens expire in 30 minutes. Recovery flow: "resend message" button on `C-03`.

---

## 9. Geolocation

Used in three places:

1. **Anti-fraud at scan time.** Browser Geolocation API on `C-00`. Result recorded as confidence signal on the scan event. Not a hard gate.
2. **"Stores near me" suggestions.** `C-02 Progress` and `C-06 My Account`.
3. **Heatmap visualization.** `A-04` admin dashboard.

Stack:
- Google Maps Embed API (read-only) for v0.
- `merchants.lat`, `merchants.lng` columns. Optional `google_place_id` for cross-reference.
- Migrate to Leaflet + OpenStreetMap when Google Maps cost scales.

---

## 10. LGPD by design

- Explicit opt-in per CDL on `C-00`.
- Granular consent: opt-in for *this* CDL ≠ for future campaigns ≠ for other CDLs.
- Right to deletion: `C-06` has a "delete account" button. Soft delete, purged within 30 days.
- Right to export: `C-06` allows downloading all data as JSON.
- Co-controllership table:

| Data type | Controller | Processor |
|---|---|---|
| Platform account (phone, locale, master opt-in) | Painel Vizinho | — |
| Campaign engagement (stamps, entries, opt-ins) | CDL | Painel Vizinho |
| WhatsApp messages | CDL | Painel Vizinho + Meta |

Privacy policy unifies platform-level controls and references the relevant CDL DPO for campaign-specific concerns.

---

## 11. Anti-fraud layered defenses

| Layer | What it does | Cost | Effectiveness |
|---|---|---|---|
| Geolocation check | ~80m radius from merchant lat/lng | zero merchant cost | kills 95% of casual fraud |
| Rate limit per (phone, merchant) | One stamp per merchant per (campaign-defined window) | zero | prevents trivial repetition |
| Rotating session token | QR is static, but issued URL token has short lifetime | zero | defeats "photograph QR, use elsewhere later" |
| Merchant visibility feed in `M-03` | Real-time view of recent scans | zero (passive) | merchant can flag anomalies |
| LGPD-stated penalty | Opt-in copy mentions disqualification on fraud | zero | reduces casual attempts |

None alone is bulletproof. Goal: cost of fraud > expected value of prize for the typical attacker.

For Cartão Fidelidade with physical prizes, **merchant validation via `M-06` is the primary defense at redemption time**.

---

## 12. v0 IN / OUT

### IN
- Three campaign templates: Passport, Cartão Fidelidade, Sorteio (visit-based)
- Customer-scan-only via static QR posters
- Identification via WhatsApp magic link, captured on first useful screen
- Auto-enroll in all eligible campaigns at the merchant on first identification
- Layered anti-fraud (geo, rate limit, rotating token, feed, LGPD warning)
- Multi-tenant white-label (logo, colors, subdomain, WhatsApp template copy)
- Mobile-first PWA — no native app
- LGPD opt-in / opt-out / export / delete
- C-06 cross-CDL view (the platform-branded screen)
- Geolocation via Google Maps
- 3 fixed QR poster templates with auto-applied CDL logo

### OUT
- Native mobile apps
- Stamp Scanner (merchant scanning the customer phone) — explicitly removed
- Push notifications (WhatsApp substitutes)
- Sorteio with transaction-value-based entries (requires merchant input at counter, deferred to v1)
- Real cashback / payments
- Tiered loyalty (bronze / silver / gold)
- Social: referrals, sharing
- POS integration
- Predictive analytics
- Languages beyond PT-BR / ES
- Final product naming (placeholder = "Painel Vizinho")

---

## 13. Open questions / follow-ups

1. Final product naming.
2. Pricing model post-pilot: SaaS subscription per CDL? Revenue share? TBD.
3. WhatsApp Business API costs: covered by platform during pilot; renegotiate post-pilot.
4. Edge case: customer clicks magic link AFTER 30-minute expiry. UX for "expired, resend" — needs design pass.
5. Edge case: customer at 6/6 in Passport scans another store. UX for "you're already done" vs. "+1 stamp anyway" — needs decision.
6. Edge case: customer is the raffle winner but hasn't seen the WhatsApp yet. UX for "you won!" surfacing on next scan.
7. Accessibility audit (WCAG AA) post-MVP.

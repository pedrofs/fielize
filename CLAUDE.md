# AGENTS.md — Fielize

> **Read this file first.** It is the entry point for any coding agent working on this project. After reading, follow the links in the "Where to find what" section to load deeper context as needed for the current task.

---

## Project at a glance

**Fielize** is a multi-tenant campaign-management SaaS for merchant associations (Brazilian "CDLs" — Câmaras de Dirigentes Lojistas). Each CDL operates a white-labeled instance that lets it run loyalty and reward campaigns across its associate merchants.

**Launch customer:** CDL Jaguarão / RS, a small border city merchant association that runs a tourist passport campaign (Pasaporte de Compras) for Uruguayan visitors. Their existing manual operation cost R$3,000 with no measurable return — this product replaces it.

**Long-term play:** ~1,200 CDLs nationally under the CNDL federation. Multi-tenant from day one even when CDL Jaguarão is the only customer.

**Why this exists:** The historical CDL value prop (SPC Brasil credit checks) is being commoditized. Associations need new reasons for merchants to remain associated. A campaign platform — especially per-merchant Cartão Fidelidade as an always-on benefit — is positioned as a candidate replacement value driver.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Database, auth, storage | Supabase (Postgres + Auth + RLS + Storage) |
| Hosting | Vercel (Pro plan for wildcard subdomains) |
| WhatsApp | WhatsApp Business API via **Z-API** (BR-friendly) or 360dialog |
| QR generation | `qrcode` npm + server-rendered PDF posters |
| Maps | Google Maps Embed API (read-only) — migrate to Leaflet/OSM later |
| i18n | `next-intl` with PT-BR (default), ES (Uruguay), EN |
| Analytics | PostHog |
| CSS | Tailwind CSS |

---

## Key architectural decisions (the "do/don't" for every PR)

These are non-negotiable unless re-litigated explicitly. Apply them everywhere.

1. **Multi-tenancy via RLS.** Every domain table has `association_id`. Every Supabase query is implicitly scoped by RLS policies based on the JWT claim `association_id`. Cross-tenant queries must always return zero rows.

2. **Users are platform-level, NOT tenant-scoped.** A consumer (phone number) has one identity across all CDLs. This is the "Stripe model" — consumers see CDL-branded experiences, but their account, opt-ins, and history live at the platform level. CDLs only see consumers who engaged with their own campaigns.

3. **Customer-scan-only.** The merchant never scans the customer's phone. Customers scan a static QR poster at the merchant's caixa. Merchants do not need a smartphone, an app, or any login to record visits. This is a hard constraint for adoption.

4. **One QR per store, not per campaign.** A single QR code at the merchant's caixa serves all active campaigns at that merchant simultaneously. The scan endpoint enrolls the customer in eligible campaigns and registers the visit/stamp/entry across all of them in one shot.

5. **Identification captured early, not deferred.** The first useful screen (`C-00 Store Landing`) shows the campaigns AND captures WhatsApp inline. Confirmation happens via a magic link sent to WhatsApp. Subsequent scans for that customer are silent (90-day session).

6. **Cartão Fidelidade is merchant-activated, not auto-provisioned.** When a merchant joins the CDL, they do NOT automatically get a Cartão Fidelidade program. They configure and activate their own via screen `M-07`.

7. **Reward validation is configurable per campaign, not per template.** Two flags on the campaign config:
   - `reward_type`: `raffle` (single winner drawn at end) or `individual` (per-customer reward).
   - `requires_merchant_validation`: when true, redemption (and optionally check-in) requires the merchant to validate a 6-digit code via the public `/r/[storeId]` page (`M-06`).

8. **Cartão Fidelidade can exceed threshold (11/10, 12/10…).** Customers continue accumulating visits past the threshold. On redemption, the system consumes N visits (the threshold) and the excess starts the next card automatically.

9. **Reward redemption has no expiration.** Customers go to the merchant whenever they can. Codes are valid until redeemed or canceled.

10. **LGPD by design.** Opt-in is granular per campaign, retention policy enforced, deletion + export endpoints from day one. Co-controllership: platform is controller for account-level data; CDL is controller for campaign-level data.

11. **Idempotency keys vary per template.**
    - Passport: `(participation_id, merchant_id)` unique forever — one stamp per merchant per customer per campaign.
    - Cartão Fidelidade: `(user_id, merchant_id, day)` — one visit per day.
    - Sorteio (visit-based): `(user_id, merchant_id, day)` — one entry per day per merchant; cap configurable.

12. **Geolocation is anti-fraud, not a hard gate.** Browser geolocation permission is requested at scan time. Result is recorded as confidence signal. Failure (denied, GPS off, indoor) does NOT block the scan; it just records lower confidence on the event.

13. **Anti-fraud in layers, none alone.** Geo + rate-limit + rotating session token + merchant visibility feed + LGPD-stated penalty for fraud. Goal is to make fraud cost > reward EV, not to block fraud absolutely.

---

## Build sequence (vertical slices)

Do NOT try to build all of v0 at once. Each slice below should be independently demo-able.

| # | Slice | Done = |
|---|---|---|
| 1 | Tenant setup + middleware + theming | `cdljaguarao.localhost:3000` resolves and applies CDL colors via CSS variables |
| 2 | Supabase schema + RLS + admin auth | CDL admin logs in, sees an empty branded admin shell. Cross-tenant test passes. |
| 3 | Merchant CRUD + onboarding flow | Admin invites 3 merchants, each gets magic link, completes profile, gets QR poster PDF |
| 4 | Scan flow + Store Landing + WhatsApp magic link | Customer scans a QR, sees campaigns (none yet), submits WhatsApp, receives magic link, identifies |
| 5 | Passport template (first reward type) | Full passport flow end-to-end: scan → stamp → 6/6 → raffle entry → admin runs auto-draw |
| 6 | Cartão Fidelidade + M-07 merchant config | Merchant activates own card, customer accumulates, `M-06` redemption with overflow handling |
| 7 | Sorteio (visit-based) template | Third template wired |
| 8 | A-04 live dashboard + closeout flow | Real-time campaign metrics, end-of-campaign auto-draw with verifiable seed |

**Estimated effort:** ~1 weekend per slice for the implementer. Slices 5–7 share most infrastructure.

---

## Do / Don't (extracted from prior decisions, repeated for emphasis)

**Do:**
- Always include `association_id` on new domain tables.
- Test cross-tenant isolation on every PR that touches data access.
- Generate codes with crypto-random, never `Math.random()`.
- Store phone numbers in E.164 format always.
- Ship error states + loading states with the happy path. Don't defer.
- Validate WhatsApp webhook signatures.
- Use idempotency keys per template (see decision #11).
- Apply for WhatsApp template approval (Meta) on day 1; takes 1–24h.

**Don't:**
- Don't add screens that ask the merchant to scan customer phones.
- Don't make redemption codes expire.
- Don't make geolocation permission a hard requirement to scan.
- Don't use `Math.random()` for codes or seeds.
- Don't skip RLS on any new table.
- Don't hardcode CDL Jaguarão. Multi-tenant from day one.
- Don't merge to main without an integration test that proves cross-tenant isolation.

---

## Where to find what

| If you need… | Read |
|---|---|
| Visual source of truth (every screen) | `docs/wireframes.html` |
| Detailed UX flows + WhatsApp message templates | `docs/ux-design.md` |
| Schema, RLS, API endpoints, auth | `docs/data-model.md` |
| WhatsApp templates with placeholders + Meta categories | `docs/whatsapp-templates.md` |
| Why this product exists, who it's for, commercial direction | `docs/product/vision.md` |
| How CDLs work in Brazil (federation structure, fees, politics) | `docs/product/cdl-context.md` |
| Past architectural decisions with reasoning | `docs/product/decisions-log.md` |

---

## Conventions

- **File structure:** App Router under `app/`, with tenant-aware routes at `app/_tenants/[tenant]/...`. Public marketing site at `app/(marketing)/...`.
- **Naming:** snake_case for DB columns, camelCase for TypeScript, kebab-case for URL slugs.
- **Migrations:** every schema change is a migration file in `supabase/migrations/`. Never edit existing migrations.
- **Env vars:** `.env.local` for dev, `.env.example` checked in with placeholders.
- **Tests:** Vitest for unit, Playwright for E2E. Cross-tenant boundary test is mandatory in slice 2 onward.
- **Commits:** Conventional Commits format. Reference the slice number where applicable: `feat(slice-3): merchant onboarding magic link`.
- **PR scope:** one slice or one decision per PR. Avoid "and also fixed X" PRs.

---

## Things that often get missed (review checklist)

When reviewing a PR, check:

- [ ] All new tables have `association_id` and matching RLS policies
- [ ] Idempotency key respects the template's semantics
- [ ] Loading and error states are present, not just happy path
- [ ] Phone numbers stored in E.164
- [ ] Redemption code generation uses crypto-random
- [ ] LGPD: any new collection point has explicit opt-in copy
- [ ] WhatsApp messages use approved templates, not free-form (outside 24h window)
- [ ] No `Math.random()` for anything user-facing
- [ ] Cross-tenant integration test still passes

---

## Naming note

The product is named **Fielize** (verb form of *fidelizar*). `fielize.com` is registered. The repo directory (`painel_vizin`) keeps the old codename — that's cosmetic, don't rename.

Avoid hardcoding the brand name in copy or markup. The platform is white-labeled per CDL, so any consumer-facing surface that says "Fielize" must read from a config / env var (e.g. `NEXT_PUBLIC_PLATFORM_NAME`) — the CDL admin shell shows "Fielize", but the consumer-facing scan flow shows the CDL's own brand.

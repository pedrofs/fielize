# Data Model & API — Fielize v0

> Engineering blueprint. Pair with `ux-design.md` for the product side.

---

## 1. Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Server components for tenant resolution |
| Database | Supabase Postgres | RLS for multi-tenancy |
| Auth | Supabase Auth | JWT carries `association_id` and role |
| Storage | Supabase Storage | Logos, merchant photos, generated PDFs |
| WhatsApp | Z-API or 360dialog | Both BR-friendly; pick one for v0 |
| Hosting | Vercel (Pro) | Wildcard subdomain support |
| QR generation | `qrcode` npm | Server-render PDFs for printing |
| Maps | Google Maps Embed | Migrate to Leaflet/OSM later |
| i18n | `next-intl` | PT-BR, ES-UY, EN |
| Analytics | PostHog | Self-host or cloud, TBD |

---

## 2. Multi-tenancy & identity model

The platform follows a **co-controllership / Stripe-like** model:

- **Consumer (`users` table) is platform-level.** No `association_id`. One phone = one account across all CDLs. Account-level data (phone, locale, opt-in to platform terms) is controlled by the platform.
- **All other domain entities are tenant-scoped.** `merchants`, `campaigns`, `participations`, `events`, `admins` all carry `association_id`. RLS policies enforce isolation.
- **Engagement bridges them.** `participations` and `events` reference both a `user_id` (platform-level) and an `association_id` (tenant-scoped). Each CDL only sees engagement that occurred within its tenant.

Implication: a consumer who has scanned at multiple CDLs has one `users` row but multiple `participations` rows, each scoped to a specific CDL.

---

## 3. Schema

All tables include `created_at timestamptz default now()` and `updated_at timestamptz` (auto-updated via trigger). Omitted from each definition for brevity.

### `associations`
The tenant root.

```sql
id                 uuid primary key
slug               text unique not null     -- 'cdl-jaguarao' (used in subdomain)
name               text not null            -- 'CDL Jaguarão'
city               text
state              text                     -- 'RS'
country            text default 'BR'
contact_whatsapp   text
locale_default     text default 'pt-BR'
locales_enabled    text[] default '{pt-BR,es-UY}'
brand              jsonb                    -- { logo_url, primary_color, accent_color }
custom_domain      text                     -- optional CNAME, e.g. 'campanhas.cdljaguarao.com.br'
status             text default 'active'    -- 'active', 'suspended'
```

### `merchants`
A merchant (shop) belonging to one CDL.

```sql
id                 uuid primary key
association_id     uuid not null references associations
name               text not null
category           text                     -- 'calçados', 'moda', 'gastronomia', etc.
address            text
lat                numeric(10,7)
lng                numeric(10,7)
google_place_id    text
phone_whatsapp     text
hours              jsonb                    -- per-day open hours
photo_url          text
status             text default 'active'    -- 'active', 'paused'
unique (association_id, name)
```

### `campaign_templates`
Library of campaign types. Seeded data, not user-editable in v0.

```sql
id                 text primary key         -- 'passport', 'cartao_fidelidade', 'sorteio'
name_i18n          jsonb                    -- { 'pt-BR': '...', 'es-UY': '...' }
description_i18n   jsonb
config_schema      jsonb                    -- JSON Schema describing valid `campaigns.config`
default_reward_type text                    -- 'raffle' or 'individual'
```

Initial seed:
- `passport` — multi-merchant, raffle, ends_at required
- `cartao_fidelidade` — single-merchant, individual, ends_at nullable
- `sorteio` — multi-merchant, raffle, visit-based, ends_at required

### `campaigns`
An instance. The launch case is a single passport campaign per CDL.

```sql
id                 uuid primary key
association_id     uuid not null references associations
template_id        text not null references campaign_templates
slug               text not null            -- 'pasaporte-2026'
name_i18n          jsonb not null
description_i18n   jsonb
audience_segments  text[]                   -- {'tourist_uy', 'resident'}
locales            text[]                   -- {'es-UY'} or {'pt-BR'} or both
starts_at          timestamptz
ends_at            timestamptz              -- nullable for cartao_fidelidade
status             text default 'draft'     -- 'draft', 'live', 'ended', 'archived'
reward_type        text not null            -- 'raffle' or 'individual'
requires_validation_on_check_in  boolean default false
requires_merchant_validation_on_redemption  boolean default false
config             jsonb                    -- template-specific:
                                            --   passport: { stamps_required: 6, prize: '...' }
                                            --   fidelidade: { threshold: 10, prize: '...', auto_renew: true }
                                            --   sorteio: { entries_per_day: 1, prize: '...' }
created_by         uuid references admins
unique (association_id, slug)
```

### `campaign_merchants`
Which merchants participate in which campaign.

```sql
campaign_id        uuid references campaigns
merchant_id        uuid references merchants
joined_at          timestamptz default now()
status             text default 'confirmed' -- 'invited', 'confirmed', 'opted_out'
primary key (campaign_id, merchant_id)
```

For `cartao_fidelidade` campaigns, this is always exactly one merchant — the one that owns the program.

### `users` (platform-level — NO association_id)
Consumers. Identified by phone after first opt-in.

```sql
id                 uuid primary key
phone_e164         text unique              -- nullable until first opt-in
name               text
locale             text                     -- 'es-UY', 'pt-BR'
country            text                     -- inferred from phone country code
whatsapp_opt_in    boolean default false    -- platform-level opt-in
opt_in_at          timestamptz
deleted_at         timestamptz              -- soft delete; purged within 30 days
```

### `participations`
A user's enrollment in a campaign. Scoped to one CDL.

```sql
id                 uuid primary key
association_id     uuid not null            -- denormalized for RLS
user_id            uuid not null references users
campaign_id        uuid not null references campaigns
state              jsonb default '{}'       -- { stamps: ['merchant_id_1', ...], visits: 11, entries: 3 }
opted_in_at        timestamptz              -- per-campaign opt-in (separate from platform-level)
completed_at       timestamptz              -- when they hit threshold
prize_drawn        boolean default false    -- raffle: was this user the drawn winner?
unique (user_id, campaign_id)
```

### `events`
Append-only log. Source of truth for all dashboards and replay.

```sql
id                 uuid primary key
association_id     uuid not null            -- denormalized for RLS
campaign_id        uuid references campaigns
merchant_id        uuid references merchants
user_id            uuid references users
participation_id   uuid references participations
type               text not null            -- 'qr_scan', 'stamp_granted', 'visit_recorded',
                                            -- 'entry_recorded', 'opt_in', 'redemption_requested',
                                            -- 'redemption_validated', 'whatsapp_sent', 'whatsapp_delivered'
payload            jsonb
geo_lat            numeric(10,7)
geo_lng            numeric(10,7)
geo_confidence     text                     -- 'high', 'medium', 'low', 'denied'
created_at         timestamptz default now()
index (association_id, campaign_id, created_at desc)
index (merchant_id, created_at desc)
index (user_id, created_at desc)
```

### `redemption_codes`
6-digit codes for individual rewards (Cartão Fidelidade) or check-in validation (when configured).

```sql
id                 uuid primary key
code               text not null unique     -- 6-digit, crypto-random
association_id     uuid not null
campaign_id        uuid not null references campaigns
merchant_id        uuid not null references merchants
participation_id   uuid not null references participations
user_id            uuid not null references users
purpose            text not null            -- 'redemption' or 'check_in_validation'
status             text default 'pending'   -- 'pending', 'used', 'cancelled'
prize_description  text                     -- snapshot of prize at issue time
visits_to_consume  int                      -- for cartao_fidelidade: how many to subtract on use
issued_at          timestamptz default now()
used_at            timestamptz
expires_at         timestamptz              -- NULL for redemption codes (no expiration)
                                            -- 30-min for check_in_validation codes
```

### `admins`
CDL staff and merchant owners.

```sql
id                 uuid primary key
auth_user_id       uuid                     -- references Supabase Auth user
email              text unique
name               text
role               text not null            -- 'super_admin', 'association_admin', 'merchant_admin'
association_id     uuid references associations
merchant_id        uuid references merchants
```

### `whatsapp_messages`
Audit trail.

```sql
id                 uuid primary key
association_id     uuid
user_id            uuid references users
template_name      text                     -- 'cdl_optin_confirmation', etc.
status             text                     -- 'queued', 'sent', 'delivered', 'read', 'failed'
provider_message_id text
payload            jsonb                    -- placeholder values used
sent_at            timestamptz
```

---

## 4. RLS strategy

Every tenant-scoped table has RLS enabled. JWT carries:

```
{
  sub: <auth_user_id>,
  role: 'association_admin' | 'merchant_admin' | 'super_admin' | 'consumer',
  association_id: <uuid> | null,
  merchant_id: <uuid> | null
}
```

### Standard policy template (applied to all tenant-scoped tables)

```sql
create policy "tenant_isolation"
on <table>
for all
using (
  case auth.jwt() ->> 'role'
    when 'super_admin' then true
    when 'association_admin' then association_id::text = auth.jwt() ->> 'association_id'
    when 'merchant_admin' then association_id::text = auth.jwt() ->> 'association_id'
                                and merchant_id::text = auth.jwt() ->> 'merchant_id'
    when 'consumer' then false  -- consumers don't query directly
    else false
  end
);
```

### Special cases

- **`users` table:** consumer can SELECT/UPDATE only their own row (`id = auth.uid()`). Admins cannot SELECT directly; they see users only via joins on `participations` scoped to their tenant.
- **`participations`:** consumer can SELECT only their own. Admin sees all in their tenant.
- **`events`:** insert allowed by service role only (via API route). SELECT scoped by tenant.

### Mandatory test

A test must verify cross-tenant isolation — e.g., create CDL A and CDL B, an admin in each, and prove that A's admin cannot read B's merchants/campaigns/events. This test runs on every CI build.

---

## 5. API surface (REST + Supabase realtime channels)

### Public consumer routes (anonymous or JWT-authenticated)

```
GET    /s/[storeId]                           → resolve store, list active campaigns
                                                Returns 404 if store doesn't exist
                                                Used by C-00 Store Landing
POST   /api/scan                              → one scan = update all eligible campaigns
                                                Body: { storeId, geo: { lat, lng } }
                                                Returns: { participations_updated: [...], pending_validations: [...] }
                                                Idempotent per template's key
POST   /api/identify                          → submit phone, send magic link
                                                Body: { phone_e164, opt_in: true, association_id }
GET    /api/identify/verify                   → verify magic link token; identify session
                                                Query: ?token=<jwt>
POST   /api/redeem                            → request a redemption (Cartão Fidelidade threshold reached)
                                                Body: { participation_id }
                                                Returns: { code, prize_description, visits_to_consume }
GET    /api/me                                → current user account + participations
                                                Used by C-06 My Account
DELETE /api/me                                → soft-delete account (LGPD)
GET    /api/me/export                         → JSON export (LGPD)
```

### Merchant routes

```
GET    /api/m/me                              → merchant profile
GET    /api/m/me/dashboard                    → metrics: visits, ranking, pending redemptions, feed
GET    /api/m/me/campaigns                    → campaigns this merchant participates in
PATCH  /api/m/me/campaigns/[id]               → toggle opt-out
POST   /api/m/me/cartao-fidelidade            → activate/configure own loyalty program
PATCH  /api/m/me/cartao-fidelidade            → update threshold, prize, validation flag
```

### Validation routes (no login — public web at /r/[storeId])

```
POST   /r/[storeId]/validate                  → validate a 6-digit code
                                                Body: { code }
                                                Returns: { ok: true, customer_name, prize, visits_to_consume }
                                                Or: { ok: false, reason: 'expired' | 'invalid' | 'wrong_store' | 'already_used' }
```

### CDL admin routes

```
GET    /api/admin/dashboard                   → cross-campaign rollup
POST   /api/admin/campaigns                   → create campaign
PATCH  /api/admin/campaigns/[id]              → update / publish
POST   /api/admin/campaigns/[id]/end          → mark as ended
POST   /api/admin/campaigns/[id]/draw         → execute auto-draw with verifiable seed
GET    /api/admin/campaigns/[id]/dashboard    → live metrics (also via Supabase realtime channel)
GET    /api/admin/merchants                   → directory
POST   /api/admin/merchants                   → invite (sends magic link)
GET    /api/admin/settings                    → white-label config
PATCH  /api/admin/settings                    → update branding, domain, WhatsApp templates
```

### Webhooks

```
POST   /api/webhooks/whatsapp                 → delivery, read, replies
                                                Validate signature on every request
```

---

## 6. Idempotency keys

The scan endpoint applies different idempotency rules per campaign template:

| Template | Idempotency key on the per-campaign event | Effect of duplicate |
|---|---|---|
| `passport` | `(participation_id, merchant_id)` | Silently no-op. Returns existing event. |
| `cartao_fidelidade` | `(user_id, merchant_id, day)` | Silently no-op for that day. |
| `sorteio` | `(user_id, merchant_id, day)` | Silently no-op for that day; cap can be configured higher. |

These keys live in the `events` table as a unique constraint per relevant template. A single scan that affects multiple campaigns inserts one event per campaign, each respecting its own key.

---

## 7. Code generation

Redemption and validation codes:

```typescript
import { randomInt } from 'node:crypto';

function generateCode(): string {
  // 6-digit code with leading zeros if necessary
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}
```

**Never use `Math.random()`** for code or seed generation. Verify uniqueness against active codes within the same `(association_id, merchant_id)` scope before issuing.

For raffle auto-draw seed:

```typescript
import { createHash } from 'node:crypto';

function drawSeed(campaignId: string, endsAt: Date): string {
  return createHash('sha256')
    .update(`${campaignId}:${endsAt.toISOString()}`)
    .digest('hex');
}
```

The seed is deterministic and verifiable: anyone can reproduce the draw given the campaign ID and end timestamp.

---

## 8. Subdomain routing & theming

### DNS

Two records on the platform's domain (e.g., `fielize.com`):

```
A      fielize.com        76.76.21.21
CNAME  *.fielize.com      cname.vercel-dns.com
```

### Vercel

Add both `fielize.com` (apex) and `*.fielize.com` (wildcard) as project domains. SSL via Let's Encrypt is automatic. Pro plan required for wildcard.

### Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';

const ROOT_DOMAINS = new Set([
  'fielize.com',
  'www.fielize.com',
  'localhost:3000',
]);

export function middleware(req) {
  const hostname = req.headers.get('host') ?? '';
  if (ROOT_DOMAINS.has(hostname)) return NextResponse.next();

  const subdomain = hostname.replace(/\.fielize\.com$/, '');
  const url = req.nextUrl.clone();
  url.pathname = `/_tenants/${subdomain}${url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

All tenant-aware routes live under `app/_tenants/[tenant]/...` and resolve the CDL config from a cached lookup.

### Theming

A server component at the tenant route root sets CSS variables on the `<html>` element:

```tsx
// app/_tenants/[tenant]/layout.tsx
const tenant = await getTenantBySlug(params.tenant);

return (
  <html style={{
    '--cdl-primary': tenant.brand.primary_color,
    '--cdl-accent': tenant.brand.accent_color,
  } as React.CSSProperties}>
    ...
  </html>
);
```

All CDL-branded UI uses `var(--cdl-primary)` / `var(--cdl-accent)` for color. The platform-branded `C-06` uses a fixed neutral palette (indigo / violet).

---

## 9. WhatsApp integration

See `whatsapp-templates.md` for the full template catalog.

Implementation notes:
- Use **Z-API** or **360dialog**. Z-API is simpler / cheaper; 360dialog has stronger compliance tooling.
- All transactional sends use Meta-approved templates.
- Magic link: JWT signed with platform secret, expires in 30 minutes. Validated server-side on `/api/identify/verify`.
- Audit every send to `whatsapp_messages` for cost tracking and debugging.

---

## 10. Storage organization (Supabase Storage)

```
buckets/
  branding/                 -- public read
    [association_slug]/
      logo.svg
      logo.png
  merchants/                -- public read
    [association_slug]/
      [merchant_id]/
        photo.jpg
  qr-posters/               -- private; signed URLs only
    [association_slug]/
      [merchant_id]/
        poster-customer.pdf
        poster-merchant.pdf
  user-exports/             -- private; signed URLs only, expire in 7 days
    [user_id]/
      export-[timestamp].json
```

---

## 11. Build sequence (recap from AGENTS.md)

1. **Tenant setup + middleware + theming**
2. **Schema + RLS + admin auth**
3. **Merchant CRUD + onboarding flow**
4. **Scan flow + Store Landing + WhatsApp magic link**
5. **Passport template** (first reward type)
6. **Cartão Fidelidade** + M-07 + M-06 redemption with overflow
7. **Sorteio** (visit-based)
8. **A-04 live dashboard + closeout flow**

Each slice ~1 weekend.

---

## 12. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Cross-tenant data leak | Critical | RLS on every table; mandatory integration test on every PR. |
| Idempotency bug → duplicate stamps | High | Unit tests per template; database-level unique constraints. |
| WhatsApp template approval delay | Medium | Apply day 1; SMS fallback wired but disabled. |
| Magic link expired → user dropped | Medium | "Resend" button on C-03; clear "expired, retry" copy. |
| Geolocation denied → low-quality fraud signal | Low | Layered defenses; geo is one signal, not a gate. |
| Vercel wildcard on Pro plan only | Low | Confirmed in scope. ~$20/mo. |
| Cartão Fidelidade overflow accounting bug | Medium | Test: visits=11, redeem, assert remaining card has visits=1. |
| Codes collide within same store | Low | Crypto-random + uniqueness check before issue. |

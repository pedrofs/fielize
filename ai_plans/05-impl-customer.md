# Implementation plan — Customer flows (C1, C2, C3)

Scope: the three customer-facing flows described in
[`./00-overview.md`](./00-overview.md) under "Customer flows":

- **C1** — first-time identification at `/s/:merchant_slug` (phone +
  WhatsApp + LGPD).
- **C2** — async WhatsApp verification: a signed link, clicked later by
  the customer, sets `customers.verified_at`. Non-blocking.
- **C3** — recurring scans: signed cookie recognized; new `Visit` and
  `Stamp` rows registered (frictionless or code-required depending on
  per-campaign `requires_validation`).

Wireframes for each screen are inline in the overview — see
[overview §Customer flows](./00-overview.md#customer-flows). Do not
re-render them here.

This plan assumes the data model from
[`./01-data-model.md`](./01-data-model.md) is in place: `customers`,
`visits`, `campaigns` (STI), `campaign_merchants`, `prizes`, `stamps`
(with `code`, `expires_at`, `confirmed_at` on the row — there is **no**
`PendingCheckIn` table), `redemptions`. Customer verification uses
`customers.verified_at` (nullable) plus a signed token from
`Rails.application.message_verifier(:customer_verification)`.

---

## 1. Context

The customer surface is the entire reason the platform works. The
vision document (`ai_docs/vision.md`) sets a hard constraint: **friction
must be lower than the paper Pasaporte** the merchants already run. The
customer must succeed without installing an app, without logging in, and
without being asked a second time on subsequent visits in the same
browser.

Three locked decisions from
[overview §Cross-cutting decisions](./00-overview.md#cross-cutting-decisions-locked)
drive everything below:

1. **Customer is not a Clerk user.** Identity is a row in `customers`
   keyed by phone (E.164) + a 90-day signed cookie.
2. **Verification is async and non-blocking.** WhatsApp delivers a
   signed verification link; the customer is fully functional before
   they ever click it.
3. **Frictionless scan is the default**; per-campaign
   `requires_validation` flag opts a campaign into the 6-digit code
   flow. A single visit with mixed campaigns shows **one** code that
   covers all pending stamps from that visit.

This plan is the third in the per-persona series alongside
`02-impl-admin.md` and `03-impl-merchant.md` (existence of the latter
two is assumed; this plan does not depend on them being shipped first,
but the manual verification steps in §13 do require Admin flow A3.2 to
be available so a campaign can exist).

## 2. Goals

- Public, no-Clerk-auth surface at `/s/:merchant_slug`.
- First scan: capture phone + WhatsApp + LGPD opt-in, create the
  customer, set the cookie, register the visit and stamps **in the same
  request**, enqueue an async WhatsApp verification message.
- Returning scan: cookie recognized; identify form is skipped; new
  visit + stamps registered; progress page shown.
- Validated campaigns produce a single shared 6-digit code per visit;
  non-validated campaigns are confirmed immediately.
- Verification link sets `verified_at` and shows a success page; works
  even when no one is signed in.
- All cross-process casing handled by `inertia-caseshift`; server stays
  `snake_case`, frontend stays `camelCase`.
- Idempotent at the right granularities (see §"Critical correctness").

## 3. Out of scope

- **SMS verification.** WhatsApp link only.
- **Customer self-service profile editing.** No "edit my name / phone"
  page in v1. Re-identification with the same phone updates the
  WhatsApp number on the existing record (idempotent at the phone
  uniqueness key); explicit profile UI is later.
- **Geolocation gate** ("you must be within X meters of the
  merchant"). Not in v1; the QR code is the implicit location proof.
- **Customer login.** No password, no magic link; the cookie is the
  only auth mechanism.
- **Redemption from the customer device.** Customer page is read-only
  for prize state; redemption is merchant-initiated (see
  `03-impl-merchant.md`, M5).
- **WhatsApp provider plumbing** (Meta Cloud API / Z-API). The plan
  ships the abstraction and a dev logger; the production adapter is a
  Phase D concern and is explicitly stubbed (`raise NotImplementedError`
  in production mode) so it cannot ship as a silent no-op.
- **Multi-language UI.** Strings will be Portuguese inline for v1; i18n
  extraction comes later.

## 4. Routes

Add the following to `/Users/pedro/Projects/fielize/config/routes.rb`,
top-level (NOT inside `namespace :organizations` or `namespace
:merchants`). These are public paths and must not be gated by Clerk
middleware. None collide with the current routes (`/`, `/sign-in`,
`/sign-up`, `/organizations/...`, `/merchants/...`, `/up`).

Recommendation: collapse C1 and C3 into one URL — `GET /s/:merchant_slug`
renders the page (identify form OR scan result depending on whether the
cookie is present); `POST /s/:merchant_slug` handles both initial
identify-and-scan and re-scan. This avoids a second submit redirect on
first scan and matches how the customer perceives the flow ("scan, get
result").

```ruby
# config/routes.rb (additions; place AFTER the existing root and auth
# routes and BEFORE `namespace :organizations` — order doesn't strictly
# matter for routing, but keep the public surface visually grouped).

scope path: "/s/:merchant_slug", as: :customer_store do
  get  "/",         to: "customer/store#show",  as: ""           # /s/:merchant_slug      → show / re-scan
  post "/",         to: "customer/store#scan",  as: :scan        # /s/:merchant_slug      → identify + scan, or re-scan
end

get "/c/verify/:token",
    to: "customer/verifications#show",
    as: :customer_verification
```

Notes:

- The `as: ""` on the `get "/"` is intentional so Rails can produce
  `customer_store_path(merchant_slug: ...)` for the `show`/landing
  page; the `post "/"` gets `customer_store_scan_path`.
- `:merchant_slug` is captured as a string; the controller resolves it
  via `Merchant.find_by!(slug: ...)`.
- The `customer_store` namespace is purely a path/name scope, not a
  Rails module namespace, because both controllers live under
  `app/controllers/customer/`.

## 5. Controllers

All customer controllers live under `app/controllers/customer/`. They
must NOT inherit from `Organizations::BaseController` /
`Merchants::BaseController` (those are Clerk-gated).

**Decision: inherit from `ApplicationController` directly, not from
`InertiaController`.** Rationale:

- `InertiaController` is fine on the surface — `require_clerk_session!`
  is *not* a `before_action` there; it's only invoked in controllers
  that explicitly call it. So inheriting from `InertiaController` would
  technically work for auth gating.
- However, `InertiaController` shares `current_user`,
  `current_organization`, `current_merchant` props on every render. On
  the customer surface those are always `nil`, and the `inertia_share`
  blocks are wasted lambda invocations that read `clerk.user_id`,
  `clerk.organization_id`, etc., on a public request that has no Clerk
  session. That's harmless but noisy.
- More importantly, the customer surface needs **different** shared
  props (the resolved `Merchant` and `Organization` from the slug, plus
  the resolved `current_customer`). Mixing those into the
  staff-oriented `InertiaController` muddies the contract.
- Therefore: a dedicated `Customer::BaseController <
  ApplicationController` that includes `PageMetadata` and declares its
  own `inertia_share` blocks. The Clerk gate is never invoked.

### `app/controllers/customer/base_controller.rb`

Skeleton:

```ruby
module Customer
  class BaseController < ApplicationController
    include PageMetadata

    # Customer surface is public — explicitly NO require_clerk_session!.
    # The customer cookie is the only identity boundary.

    helper_method :current_customer

    inertia_share current_customer: -> {
      next nil unless current_customer
      {
        id: current_customer.id,
        name: current_customer.name,
        phone: current_customer.phone,        # IS the WhatsApp number
        verified: current_customer.verified_at.present?
      }
    }

    inertia_share title: -> { @title }
    inertia_share breadcrumbs: -> { @breadcrumbs || [] }

    private

    def current_customer
      return @current_customer if defined?(@current_customer)
      id = cookies.signed[:customer_session]&.dig(:customer_id)
      @current_customer = id ? Customer.find_by(id: id) : nil
    end
  end
end
```

### `app/controllers/customer/store_controller.rb`

Two actions: `#show` and `#scan`.

- **`#show`** (`GET /s/:merchant_slug`):
  - Resolve `Merchant.find_by!(slug: params[:merchant_slug])`.
  - Render `customer/store/show.tsx`.
  - Props vary by `current_customer`:
    - **No cookie / not identified** → `mode: "identify"`, plus the
      list of *campaigns about to be joined* (active campaigns for this
      merchant) so the customer can see what they're opting into. No
      Visit is created on a `GET`.
    - **Cookie present (returning customer landing page)** → `mode:
      "landing"`, plus the customer's current progress on every active
      campaign at this merchant. **No** Visit on `GET`. The actual
      "scan event" is the `POST /s/:merchant_slug` triggered by, e.g.,
      tapping a `[Registrar visita]` button or by the page POST-ing
      automatically on mount via Inertia's `router.post(...)`.
  - Recommendation: have `show` auto-`POST` on first paint for cookie
    holders so the QR-code scan UX feels frictionless ("scan → see
    progress with the new visit registered"). Implement this as an
    `Inertia.router.post(scanPath, {}, { preserveState: true })` from
    inside `store/show.tsx` when `mode === "landing"` and no scan has
    been registered yet in this page session. **But** to avoid double
    visits on refresh, gate it with a sessionStorage key or pass a
    one-shot CSRF-style nonce in the props. See §10 Open questions.

- **`#scan`** (`POST /s/:merchant_slug`):
  - Resolve `Merchant.find_by!(slug: params[:merchant_slug])`.
  - Branch on `current_customer.present?`:
    - **No cookie**: validate identify params (`phone`,
      `lgpd_opted_in`); if invalid, re-render
      `show` with `errors`. If valid:
      1. `customer = Customer::Identifier.call(...)` — see §6.
      2. Set `cookies.signed[:customer_session] = { value: {
         customer_id: customer.id }, ... }` with the cookie options in
         §7.
    - **Cookie present**: skip identify; reuse `current_customer`.
  - Either way: `result = ScanRegistrar.call(customer:, merchant:)`.
  - Re-render `customer/store/show.tsx` with `mode: "result"`, the
    visit summary, confirmed/pending stamp lists, and the shared `code`
    (if any).

### `app/controllers/customer/verifications_controller.rb`

```ruby
module Customer
  class VerificationsController < Customer::BaseController
    def show
      page_metadata title: "Confirmar WhatsApp"

      verifier = Rails.application.message_verifier(:customer_verification)
      customer_id = verifier.verify(params[:token])
      customer = Customer.find(customer_id)
      customer.update!(verified_at: Time.current) if customer.verified_at.nil?

      render inertia: "customer/verifications/show", props: {
        customer: { id: customer.id, name: customer.name, verified_at: customer.verified_at }
      }
    rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveRecord::RecordNotFound
      render inertia: "customer/verifications/show", props: { error: "invalid_or_expired" }, status: :unprocessable_entity
    end
  end
end
```

The verification link works regardless of cookie presence; the customer
who taps it from WhatsApp on a different device than the one that
scanned will not have the cookie, and that is fine.

## 6. Service objects

### `app/services/scan_registrar.rb`

Single multi-step write. Wrap in a transaction.

```ruby
class ScanRegistrar
  Result = Struct.new(:visit, :confirmed_stamps, :pending_stamps, :code, keyword_init: true)

  def self.call(customer:, merchant:)
    new(customer:, merchant:).call
  end

  def initialize(customer:, merchant:)
    @customer = customer
    @merchant = merchant
  end

  def call
    Visit.transaction do
      visit = Visit.create!(customer: @customer, merchant: @merchant)

      campaigns = active_campaigns_for(@merchant)
      requires_code = campaigns.any?(&:requires_validation?)
      shared_code   = requires_code ? generate_unique_code : nil
      expires_at    = requires_code ? Stamp::CODE_TTL.from_now : nil

      rows = campaigns.map do |campaign|
        if campaign.requires_validation?
          base_pending_row(visit, campaign, code: shared_code, expires_at: expires_at)
        else
          base_confirmed_row(visit, campaign)
        end
      end

      # Idempotent at (visit_id, campaign_id) — concurrent scans cannot
      # double-stamp. ON CONFLICT DO NOTHING via the unique index from
      # 01-data-model.md.
      Stamp.insert_all!(rows, unique_by: %i[visit_id campaign_id]) if rows.any?

      stamps = visit.stamps.includes(:campaign).to_a
      Result.new(
        visit: visit,
        confirmed_stamps: stamps.select { |s| s.status == "confirmed" },
        pending_stamps:   stamps.select { |s| s.status == "pending" },
        code: shared_code
      )
    end
  end

  private

  # Active campaigns at this merchant, both kinds:
  # - LoyaltyCampaign: campaigns.merchant_id = merchant.id, status='active'
  # - OrganizationCampaign: joined via campaign_merchants, status='active'
  def active_campaigns_for(merchant)
    org_ids = CampaignMerchant.where(merchant_id: merchant.id).pluck(:campaign_id)
    Campaign.where(status: "active").where(
      "(merchant_id = ?) OR (id IN (?))",
      merchant.id, org_ids
    ).to_a
  end

  def base_confirmed_row(visit, campaign)
    {
      visit_id: visit.id, campaign_id: campaign.id,
      customer_id: @customer.id, merchant_id: @merchant.id,
      status: "confirmed",
      confirmed_at: Time.current,
      created_at: Time.current
    }
  end

  def base_pending_row(visit, campaign, code:, expires_at:)
    {
      visit_id: visit.id, campaign_id: campaign.id,
      customer_id: @customer.id, merchant_id: @merchant.id,
      status: "pending",
      code: code, expires_at: expires_at,
      created_at: Time.current
    }
  end

  # Per 01-data-model.md, no DB unique on (merchant_id, code) — pending
  # stamps from one visit share one code by design. The collision check
  # is across DIFFERENT visits' active codes at the same merchant.
  def generate_unique_code
    loop do
      candidate = SecureRandom.random_number(1_000_000).to_s.rjust(6, "0")
      taken = Stamp.where(merchant_id: @merchant.id, status: "pending", code: candidate)
                   .where("expires_at > ?", Time.current)
                   .exists?
      return candidate unless taken
    end
  end
end
```

Notes:

- `Stamp::CODE_TTL = 10.minutes` is declared on `Stamp` per
  `01-data-model.md`.
- `requires_validation?` is the boolean accessor backing
  `campaigns.requires_validation`.
- Idempotency is delegated to PostgreSQL via the `(visit_id,
  campaign_id)` unique index. `insert_all!` with `unique_by:` translates
  to `ON CONFLICT (visit_id, campaign_id) DO NOTHING`. Two concurrent
  registrars for the same visit will not double-insert.
- The result struct is what `StoreController#scan` hands to the page
  props. Confirmed and pending lists are kept separate so the React
  page can split them into the two boxes shown in the wireframe.

### `app/services/customer/identifier.rb`

```ruby
module Customer
  class Identifier
    Result = Struct.new(:customer, :verification_enqueued, keyword_init: true)

    def self.call(...) = new(...).call

    def initialize(phone:, lgpd_opted_in:, name: nil)
      @phone         = phone
      @lgpd_opted_in = lgpd_opted_in
      @name          = name
    end

    def call
      customer = ::Customer.find_or_initialize_by(phone: ::Customer.normalize_phone(@phone))
      customer.assign_attributes(
        lgpd_opted_in_at: @lgpd_opted_in ? Time.current : nil,
        name:             @name.presence || customer.name
      )
      customer.save!

      enqueued = false
      if customer.verified_at.nil?
        WhatsAppDispatcher.deliver(customer, template: :verification)
        enqueued = true
      end

      Result.new(customer: customer, verification_enqueued: enqueued)
    rescue ActiveRecord::RecordNotUnique
      ::Customer.find_by!(phone: ::Customer.normalize_phone(@phone)).then do |c|
        Result.new(customer: c, verification_enqueued: false)
      end
    end
  end
end
```

Idempotency rules:

- Find-or-initialize by normalized phone. Concurrent first-time
  identifications with the same phone race-safe via the unique index
  (`rescue RecordNotUnique`).
- Verification message is enqueued only if the customer is not yet
  verified. A verified customer who re-identifies (e.g. on a new device)
  does not get spammed.
- An unverified customer who re-identifies **does** get a fresh
  verification message. This is intentional — they may have lost the
  first one. If we want to debounce, add a "last sent at" cooldown.
  See §14 Open questions.

## 7. Cookie session

The customer cookie is the only identity boundary. Treat it like an
auth cookie.

- **Name**: `customer_session`.
- **Type**: `cookies.signed[...]` (signed, not encrypted; the payload
  is just an integer id, not sensitive). If we later decide it's
  sensitive, switch to `cookies.encrypted[...]` — same API.
- **Flags**: `httponly: true`, `secure: Rails.env.production?`,
  `same_site: :lax` (we need top-level navigation from WhatsApp to send
  the cookie).
- **TTL**: 90 days.
- **Payload**: `{ customer_id: <integer> }`. Nothing else; we look up
  the row server-side.
- **Domain**: default (host-only). If the customer surface ever moves
  to a different host than the staff surface, set the cookie domain
  explicitly to the customer host.
- **Set in `StoreController#scan`** after a successful identify, and
  refreshed (set again with the same TTL) on every successful scan to
  slide the expiry forward.
- **Cleared**: never automatically by the app in v1. No logout button.

```ruby
cookies.signed[:customer_session] = {
  value: { customer_id: customer.id },
  expires: 90.days.from_now,
  httponly: true,
  secure: Rails.env.production?,
  same_site: :lax
}
```

## 8. WhatsApp dispatcher

The provider integration is deferred. The abstraction must ship now so
the rest of the flow can be tested.

### `app/services/whats_app_dispatcher.rb`

```ruby
class WhatsAppDispatcher
  TEMPLATES = %i[verification].freeze

  def self.deliver(customer, template:)
    raise ArgumentError, "unknown template: #{template}" unless TEMPLATES.include?(template)
    WhatsAppDeliveryJob.perform_later(customer.id, template.to_s)
  end
end
```

### `app/jobs/whats_app_delivery_job.rb`

```ruby
class WhatsAppDeliveryJob < ApplicationJob
  queue_as :default

  def perform(customer_id, template)
    customer = Customer.find(customer_id)
    case template
    when "verification" then deliver_verification(customer)
    else raise ArgumentError, "unknown template: #{template}"
    end
  end

  private

  def deliver_verification(customer)
    token = Rails.application.message_verifier(:customer_verification)
                 .generate(customer.id, expires_in: 30.days)
    link  = Rails.application.routes.url_helpers
                 .customer_verification_url(token: token, host: ENV.fetch("APP_HOST"))

    if Rails.env.production?
      raise NotImplementedError,
            "WhatsApp provider not configured. Wire Meta Cloud API / Z-API before shipping to prod."
    else
      Rails.logger.info("[WhatsAppDispatcher] To #{customer.phone}: verification link #{link}")
    end
  end
end
```

Why the explicit `raise NotImplementedError` in production:

- A dev-only logger that silently no-ops in production is the worst
  possible failure mode — it would let us deploy with broken
  verification and not notice for weeks.
- The job failure surfaces in Solid Queue's failed jobs and is loud
  enough to catch in a smoke test.
- When the real provider lands (Phase D), it replaces the
  `if Rails.env.production?` branch with a provider call; the dev-side
  logger stays as the development adapter.

The signed verifier key namespace `:customer_verification` is the one
spec'd in `01-data-model.md`. The token expiry is 30 days; clicking an
expired token shows the error variant of `verifications/show.tsx`.

`APP_HOST` is the existing Kamal-deployed host env var. In dev it's
`localhost:3000` (set in `.env` or `bin/dev`).

## 9. Inertia pages

All under `app/frontend/pages/customer/`. None of them use
`<AppLayout>`; the sidebar is irrelevant on the customer surface.

### `app/frontend/layouts/customer-layout.tsx`

A minimal full-screen, mobile-first shell:

- Top bar with the CDL/organization name (resolved from the
  merchant.organization passed in props) and a small close button (`╳`)
  that links to `https://fielize.com` or to a generic "thanks for
  participating" page — TBD with design.
- Centered content column, max-width ~24rem on desktop, full-width on
  mobile.
- Tailwind utility-first; no shadcn `Sidebar*` components.
- Uses `<Head />` for `<title>` (Inertia auto-prefixed by the
  `inertia.tsx` `title:` callback to "… · Fielize").

This layout is exported as a function and applied per-page (Inertia
React doesn't have a global layout slot; pages opt in by wrapping their
default export, mirroring the pattern admin/merchant pages will use
once `AppLayout` is wired up).

### `app/frontend/pages/customer/store/show.tsx`

Single component, prop-driven mode switch. Three modes:

- `mode === "identify"` — render the WhatsApp+LGPD form. Submits
  `POST /s/:merchant_slug` with `{ phone, lgpd_opted_in: true }` (the
  phone IS the WhatsApp number; one input). On error, Inertia errors
  hash repopulates field-level errors via `useForm`.
- `mode === "landing"` — returning customer; render current progress
  and a `[Registrar visita]` button (or auto-POST per §5
  recommendation).
- `mode === "result"` — post-scan; render `confirmed_stamps`,
  `pending_stamps`, optional shared `code` + `expires_at`.

Layout: top header (CDL logo + merchant name), then a single column.
Pasaporte progress as a row of squares (filled/empty), Cartão Fidelidade
as a "balance + ladder of prizes" panel — match the wireframes in
[overview §C3](./00-overview.md#c3-merchant-page--see-active-campaigns--register-a-visit).

### `app/frontend/pages/customer/verifications/show.tsx`

Two states from props:

- Success — green check, "WhatsApp confirmado!" copy from the
  wireframe, `[Voltar à loja]` button (links back to the last visited
  merchant slug if we have it; otherwise to a generic landing).
- Error (invalid/expired) — neutral copy, "Link inválido ou expirado.
  Faça uma nova visita para receber um novo link."

Both use `<CustomerLayout>`.

### Layout opt-in pattern

Each customer page exports its component with the layout wrapped in:

```tsx
import { CustomerLayout } from "@/layouts/customer-layout"
function Show(props) { /* ... */ }
Show.layout = (page: React.ReactNode) => <CustomerLayout>{page}</CustomerLayout>
export default Show
```

Inertia React's `resolve` in `inertia.tsx` already supports the
`Component.layout` convention; if it doesn't, wrap directly inside the
component body and skip the `.layout` static. Either approach works;
pick whichever the rest of the codebase converges on (admin/merchant
plans will face the same choice).

## 10. Inertia shared props

The customer surface is public, so the `current_user`,
`current_organization`, `current_merchant` shared props from
`InertiaController` are not used. The dedicated `Customer::BaseController`
shares `current_customer`, `title`, `breadcrumbs` only.

Verification: confirm no part of the **customer** code path reads
`currentUser`/`currentOrganization`/`currentMerchant` from the page
props. Components imported from shadcn are agnostic; the only risk is
accidentally reusing `<AppSidebar />` or any nav helper that assumes
those props. Mitigation: customer pages only import from
`components/ui/*` and `layouts/customer-layout.tsx`; do not import
`AppSidebar` or `AppLayout`.

If we ever decide to merge customer + staff prop contracts (e.g. so a
merchant user previewing the customer page sees their identity), do it
later — right now the surfaces are disjoint and that simplicity is
worth keeping.

## 11. Shared TypeScript types

Add the following to
`/Users/pedro/Projects/fielize/app/frontend/types/index.ts`. These are
**not** part of `SharedProps` — they are page-prop types referenced from
the customer pages. Place them after the existing `SharedProps`.

```ts
// Customer-side prop shapes (not in SharedProps).

export type CustomerSession = {
  id: number
  name: string | null
  phone: string        // E.164; IS the WhatsApp number
  verified: boolean
}

export type CustomerCampaignProgress =
  | {
      type: "loyalty"
      campaignId: number
      name: string
      balance: number
      prizes: { id: number; name: string; threshold: number }[]
    }
  | {
      type: "organizationCumulative"
      campaignId: number
      name: string
      stampedMerchantsCount: number
      prizes: { id: number; name: string; threshold: number; reached: boolean }[]
    }
  | {
      type: "organizationSimple"
      campaignId: number
      name: string
      entries: number
    }

export type CustomerStampSummary = {
  id: number
  campaignId: number
  campaignName: string
  status: "confirmed" | "pending"
}

export type CustomerStorePageProps = {
  merchant: {
    id: number
    name: string
    slug: string
    organization: { id: number; name: string; slug: string; imageUrl: string | null }
  }
  mode: "identify" | "landing" | "result"
  customer: CustomerSession | null
  // landing/result-only
  campaigns?: CustomerCampaignProgress[]
  // result-only
  visit?: { id: number; createdAt: string }
  confirmedStamps?: CustomerStampSummary[]
  pendingStamps?: CustomerStampSummary[]
  code?: string | null
  codeExpiresAt?: string | null
}

export type CustomerVerificationPageProps =
  | {
      customer: { id: number; name: string | null; verifiedAt: string }
      error?: undefined
    }
  | {
      customer?: undefined
      error: "invalid_or_expired"
    }
```

Server-side keys are `snake_case` (`phone`, `confirmed_stamps`,
`code_expires_at`, etc.) — the `inertia-caseshift` Vite plugin handles
the conversion. Always write Ruby props in `snake_case` and these TS
types in `camelCase`; never bypass the plugin.

## 12. Tests

### Model tests

- `test/models/customer_test.rb`
  - normalizes phone via `Phonelib` in `before_validation`.
  - phone presence + uniqueness.
  - `lgpd_opted_in_at` presence.
  - `verified_at` defaults to nil; not user-assignable from
    `permit(:verified_at)` (mass-assignment guard).
  - `Customer.normalize_phone("...")` class method round-trips a few
    Brazil and Uruguay numbers correctly.

### Service tests

- `test/services/scan_registrar_test.rb`
  - With one `LoyaltyCampaign` (active, `requires_validation: false`):
    creates one Visit, one confirmed Stamp, no code.
  - With one `OrganizationCampaign` (cumulative,
    `requires_validation: false`) enrolled at the merchant: creates one
    Visit, one confirmed Stamp.
  - With both: creates one Visit, two confirmed stamps, no code.
  - With one validated campaign: creates one pending Stamp with a
    6-digit code and `expires_at = now + 10.minutes`.
  - With mixed validated + non-validated: creates one pending + one
    confirmed; pending row carries the shared code; confirmed row has
    null code.
  - **Idempotency**: calling `ScanRegistrar.call` twice in the same
    transaction with the same visit (simulated by patching `Visit.create!`)
    inserts at most one stamp per (visit, campaign).
  - Inactive campaigns (status != active) at the merchant are skipped.
  - Campaigns at OTHER merchants are skipped.

- `test/services/customer/identifier_test.rb`
  - First call creates the customer, sets `lgpd_opted_in_at`, enqueues
    the `WhatsAppDeliveryJob`.
  - Second call with the same phone updates the existing row's
    `lgpd_opted_in_at` / `name`, does NOT create a duplicate, does NOT
    enqueue a second job if `verified_at` is set.
  - Same as above but `verified_at` nil → re-enqueues.
  - Race: two simultaneous calls with the same phone result in one row
    (rescue `RecordNotUnique`).

### Controller tests

- `test/controllers/customer/store_controller_test.rb`
  - `GET /s/:slug` with no cookie → 200, props include `mode:
    "identify"` and the merchant info.
  - `GET /s/:slug` with valid cookie → 200, `mode: "landing"`.
  - `POST /s/:slug` with no cookie + valid identify params:
    - Customer created.
    - Cookie set on the response (assert via
      `cookies.signed[:customer_session]`).
    - Visit + Stamps created (count assertions).
    - `WhatsAppDeliveryJob` enqueued (use
      `assert_enqueued_with(job: WhatsAppDeliveryJob)`).
    - Response props include `mode: "result"`, the right
      confirmed/pending lists, and the shared code (if any).
  - `POST /s/:slug` with no cookie + missing LGPD checkbox → 422,
    `errors.lgpd_opted_in` populated, no Customer created, no Visit, no
    job enqueued.
  - `POST /s/:slug` with cookie → reuses customer, no new Customer row,
    no verification job re-enqueued (verified path), new Visit + Stamps.
  - `POST /s/:slug` validated campaign mix → response includes
    `code` and `code_expires_at`; pending stamps list non-empty.
  - `GET /s/missing-slug` → 404.

- `test/controllers/customer/verifications_controller_test.rb`
  - Valid token sets `verified_at`, returns 200 with success props.
  - Idempotent: second click does not change `verified_at` timestamp.
  - Tampered token → 422 with `error: invalid_or_expired`.
  - Expired token (use `travel_to` past 30 days) → 422.
  - Works with and without `customer_session` cookie present (no
    interaction).

### System tests (Capybara)

- `test/system/customer_first_scan_test.rb`
  - Visit `/s/:slug`, fill phone + WhatsApp, check LGPD, submit, assert
    success page text + Pasaporte stamps shown.
  - Visit again (same browser, cookie persisted) → identify form is
    skipped, new visit registered.
- `test/system/customer_validated_campaign_test.rb`
  - With a validated campaign active at the merchant, visit `/s/:slug`
    after identifying → assert the 6-digit code is displayed and that
    pending stamps are listed.

## 13. Verification — manual end-to-end pilot scenario

This is the smoke test for the Pasaporte digitized pilot.

1. **Seed**: an Organization (CDL Jaguarão), one Merchant (Calzados
   Ricardo) with slug `calzados-ricardo`, and a Clerk-authenticated org
   admin signed in.
2. **Admin creates the campaign** (Admin flow A3.2):
   - Type: `OrganizationCampaign`, entry policy: `cumulative`.
   - `requires_validation: false`.
   - 1 prize, threshold 6 (e.g. "iPhone 15").
   - Enroll Calzados Ricardo.
   - Activate. (Activation guard requires ≥1 prize — passes.)
3. **Customer scan** — open mobile DevTools emulation, navigate to
   `http://localhost:3000/s/calzados-ricardo`.
   - Identify form renders.
   - Submit `+598 99 123 456` for phone, same for WhatsApp, check LGPD.
   - Result page renders with Pasaporte progress 1/6 confirmed.
4. **DB sanity** (`bin/rails dbconsole`):
   - `customers` has 1 row, `verified_at: NULL`, `lgpd_opted_in_at`
     set.
   - `visits` has 1 row.
   - `stamps` has 1 row, `status: 'confirmed'`, `confirmed_at` set,
     `code: NULL`.
5. **WhatsApp job**:
   - `bin/rails runner 'puts SolidQueue::Job.where(class_name:
     "WhatsAppDeliveryJob").count'` → 1.
   - Tail `log/development.log` for `[WhatsAppDispatcher]` — copy the
     verification URL.
6. **Click verify**: paste the URL into the same browser (or a
   different one — should not matter).
   - `verifications/show.tsx` renders the success state.
   - `customers.verified_at` is now set.
   - Reload the URL → still success (idempotent), `verified_at`
     unchanged.
7. **Re-scan**: navigate to `/s/calzados-ricardo` from the original
   browser:
   - Identify form is **NOT** shown.
   - Result page renders Pasaporte progress 2/6 confirmed.
   - `visits` count = 2; `stamps` count = 2; same `customer_id`.
8. **Tampered token**: edit a character in the verification URL and
   load it → error variant of `verifications/show.tsx`, status 422.

If all eight pass on a fresh DB, customer flows are pilot-ready.

## 14. Open questions and recommendations

1. **Auto-POST on landing for cookie holders.**
   - Q: Should the `landing` mode auto-POST so the customer doesn't
     have to tap "Registrar visita"?
   - **Recommend YES.** The QR scan already implies intent. Add a
     one-shot guard: a `scan_token` random string in the props,
     checked in `sessionStorage` to prevent duplicate posts on refresh.
     The duplicate is harmless thanks to idempotency at
     `(visit_id, campaign_id)` plus the new `Visit` per scan, but two
     visits on a single QR scan is semantically wrong (the customer
     scanned once).
   - Alternative: `<form>` with autosubmit on mount; same effect.

2. **Verification cooldown.**
   - Q: Should we debounce re-issuing the verification message when an
     unverified customer re-identifies?
   - **Recommend NO for v1.** They opted in via LGPD; receiving a
     second link is fine. Add a cooldown later if support volume
     suggests otherwise.

3. **Cookie scope.**
   - Q: One cookie per merchant or one global cookie per customer?
   - **Recommend global (current plan).** A single customer
     identification spans all merchants in all CDLs the platform
     hosts. If someone scans CDL-A then CDL-B, they should not be
     re-prompted at CDL-B. Phone is the global key.
   - Caveat: this implicitly allows cross-CDL identity tracking. We
     are NOT exposing this server-side cross-org (no API for "tell me
     all of customer X's stamps across CDLs"); the cookie just skips
     the identify form. Document explicitly in the LGPD copy.

4. **Cookie host.**
   - Q: Will the customer surface ever live on a different host than
     staff (`app.fielize.com` vs `clientes.fielize.com`)?
   - **Recommend NO for v1.** Same host. Revisit if rebranding per CDL
     forces a multi-host setup.

5. **`Phonelib` or another normalizer.**
   - Q: Confirm `phonelib` is acceptable.
   - **Recommend YES.** It's the standard Ruby gem for E.164 + locale
     handling; assumed by `01-data-model.md`. Add to Gemfile
     (`gem "phonelib"`); set the default country to `:br` for
     normalizer fallback in an initializer; merchants on the BR/UY
     border (Jaguarão) will need explicit country detection from the
     `+598` prefix, which Phonelib handles natively.
   - The model's `normalize_phone` class method should accept
     `+598...`, `598...`, and `99 1234 5678` (assuming country fallback)
     and produce `+59899123456...`.

6. **Re-scan quality of life.**
   - Q: Should the result page auto-refresh (via short-poll) so a
     pending code visibly turns into a confirmed stamp once the merchant
     validates?
   - **Recommend NO for v1.** Out of scope; the merchant tells the
     customer face-to-face. Future: ActionCable channel keyed on the
     customer cookie.

7. **Inertia layout pattern.**
   - Q: `Component.layout = ...` static OR per-page wrap?
   - **Recommend wait** — let admin/merchant impl plans pick first;
     mirror the choice. The customer plan is layout-pattern-agnostic.

8. **Slug collision recovery.**
   - Q: What if a customer scans a `/s/:slug` for a merchant whose slug
     was changed yesterday?
   - **Recommend out of scope here** — the slug-change concern lives in
     `02-impl-admin.md` (overview A2.4 hints at encoding `merchant_id`
     in QR codes for resilience). For this plan, `find_by!(slug: ...)`
     yields a 404 and we accept it.

---

## Critical correctness — explicit checklist

A fresh engineer should be able to verify these without reading prose:

- [ ] No `before_action :require_clerk_session!` on any
      `Customer::*Controller`.
- [ ] No `Customer::*Controller` inherits from
      `Organizations::BaseController` or `Merchants::BaseController`.
- [ ] `Customer.before_validation :normalize_phone` runs Phonelib;
      DB has unique index on `customers.phone`.
- [ ] `ScanRegistrar` calls `Stamp.insert_all!(rows, unique_by:
      %i[visit_id campaign_id])` — not `Stamp.create!` in a loop.
- [ ] `ScanRegistrar` writes ONE shared `code` to all pending stamps
      from a single visit; non-validated stamps from the same visit have
      `code: NULL`.
- [ ] `cookies.signed[:customer_session]` is set with `httponly: true`,
      `secure: Rails.env.production?`, `same_site: :lax`, 90-day TTL.
- [ ] `WhatsAppDeliveryJob` raises `NotImplementedError` in production
      until the provider is wired.
- [ ] `Rails.application.message_verifier(:customer_verification)`
      generates the token; the controller verifies and idempotently
      sets `verified_at`.
- [ ] Customer pages do NOT import `AppLayout`, `AppSidebar`, or any
      sidebar primitive; they use `CustomerLayout`.
- [ ] Customer page progress is read-only — no redemption affordance.
- [ ] All Ruby props are `snake_case`; all TS prop types in
      `types/index.ts` are `camelCase`; no manual case conversions
      anywhere in this plan's code.

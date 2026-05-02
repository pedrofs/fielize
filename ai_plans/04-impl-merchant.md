# Implementation plan — Merchant flows (M1–M5)

Companion to [`./00-overview.md`](./00-overview.md) and
[`./01-data-model.md`](./01-data-model.md). This file plans the
**merchant-user surface**: dashboard, loyalty-program management,
read-only campaign list, code validation, and merchant-initiated
redemption. Conventions live in
[`../CLAUDE.md`](../CLAUDE.md); follow them.

> Note on numbering. The overview points to `03-impl-merchant.md` as
> the merchant plan slot. The user explicitly asked for this file at
> `04-impl-merchant.md`; this file lives there. Treat the number as a
> filename, not a phase ordering.

## 1. Context

The merchant user is the lojista (or staff) of a single Merchant inside
an Organization (CDL). They sign in via Clerk; their `users.merchant_id`
is set from `public_metadata.merchant_id` on first sign-in. They never
see other merchants' data and never operate at the org level.

This plan covers wireframes M1 through M5 in
[`./00-overview.md`](./00-overview.md). The data contract — tables,
indexes, validations, state machines — is defined in
[`./01-data-model.md`](./01-data-model.md) and is **not** redefined
here.

The two cross-cutting product invariants that shape this plan:

- **Customer-scan-only** (vision §"What we must not break"): the
  merchant never scans the customer. Every flow on this surface starts
  with the customer's device having already done the work, OR with the
  merchant looking up the customer by phone.
- **Validation = Stamps, not a side table.** Per the data-model
  revision, `PendingCheckIn` was removed. The 6-digit `code`,
  `expires_at`, and `confirmed_at` live on `stamps`. **All pending
  stamps from a single visit share the same code** so the customer
  shows one code; the merchant types one code; one transaction flips
  all sibling stamps to `confirmed`.

## 2. Goals

- Merchant-only surfaces are gated by `Merchants::BaseController`
  (already in place at
  [`app/controllers/merchants/base_controller.rb`](../app/controllers/merchants/base_controller.rb)).
- Merchant dashboard (M1) shows today / this-week visit counts, a
  pending-validations counter, and recent activity.
- Loyalty-program management (M2): one `LoyaltyCampaign` per merchant,
  CRUD on its prizes, toggle on/off, disable with optional
  reset-balances semantics that match
  `LoyaltyCampaign#disable!(reset:)` in
  [`./01-data-model.md`](./01-data-model.md).
- Read-only list of OrganizationCampaigns the merchant participates in
  (M3). No opt-out for v1.
- Validate-code flow (M4): a 6-digit input that flips **every** pending
  stamp at this merchant carrying that code to `confirmed`, then shows
  the customer plus per-campaign progress for **all** active campaigns
  at the merchant the customer touched in the originating visit (not
  just the validated ones).
- Redeem-prize flow (M5): phone lookup → claimable-prize preview →
  confirm. Re-checks balance at confirmation time and writes a
  `Redemption` row with `threshold_snapshot` and
  `merchant_user_id = current_user.id`.
- All Inertia pages share the existing `<AppLayout>` shell
  ([`app/frontend/layouts/app-layout.tsx`](../app/frontend/layouts/app-layout.tsx)).
  Sidebar entries appear under "Platform" only when `isMerchantUser`.
- Snake_case ↔ camelCase by way of `inertia-caseshift`. No manual
  conversions.

## 3. Out of scope

Deferred to later phases. Do not implement here:

- **Merchant team management** (inviting / removing other staff users
  for a merchant from the merchant side). Already implemented from the
  org-admin surface at
  [`app/controllers/organizations/merchants/invitations_controller.rb`](../app/controllers/organizations/merchants/invitations_controller.rb)
  for v1; merchant-side invitation UI is Phase C.
- **Customer self-service**: customers don't redeem from their phone;
  they don't authenticate; covered in `05-impl-customer.md` (TBD).
- **OrganizationCampaign opt-out** by merchants. Org admin adds
  merchants; merchants cannot remove themselves.
- **OrganizationCampaign redemption / raffle drawing.** Both `simple`
  and `cumulative` award rules are tracked in stamps but the *winning*
  flow is deferred. Merchant redemption surface only lists
  `LoyaltyCampaign` prizes.
- **LoyaltyCampaign reactivation after disable.** Per data model,
  v1 disable is terminal. To re-enable, create a new campaign.
- **Phone-search autocomplete / typeahead.** Plain phone input for v1;
  exact-match lookup only.

## 4. Routes

Add inside the existing `namespace :merchants` block in
[`config/routes.rb`](../config/routes.rb).

```ruby
namespace :merchants do
  root "home#index", as: :merchants_root  # named to distinguish from app root
  resource  :loyalty_program, only: [:show, :update] do
    resources :prizes, only: [:new, :create, :edit, :update, :destroy],
              module: :loyalty_program
  end
  resources :campaigns,    only: :index
  resources :validations,  only: [:new, :create]
  resources :redemptions,  only: [:new, :create]
end
```

### Root resolution

The app root (`/`) currently routes to `HomeController#index`
([`app/controllers/home_controller.rb`](../app/controllers/home_controller.rb)),
which is shared. **Recommendation:** keep `/` as the shared landing
page and have `HomeController#index` branch:

```ruby
def index
  return redirect_to merchants_root_path     if current_user&.merchant_id.present?
  return redirect_to organizations_root_path if current_user&.organization_id.present?  # admin plan adds this
  render inertia: {}  # signed-in but not yet associated; fallback
end
```

This keeps the existing `/` route and Clerk redirect flow intact while
each persona lands on its own dashboard. The merchant dashboard itself
lives at `/merchants/` — that is the surface the merchant bookmarks
and the surface the sidebar "Home" entry links to (see §8).

### Naming

The data-model file uses `LoyaltyCampaign`. The merchant-facing route
and controller use **`loyalty_program`** as the user-facing noun
because the wireframe header reads "Cartão Fidelidade" / "Programa
ativo" — "campaign" is a developer concept here. The controller still
operates on a `LoyaltyCampaign` AR record; only the URL and class name
shift. (Cross-link: same convention used in §5 controllers.)

Nested prizes use `module: :loyalty_program` so the controller class is
`Merchants::LoyaltyProgram::PrizesController` — mirrors the pattern
used by
[`app/controllers/organizations/merchants/invitations_controller.rb`](../app/controllers/organizations/merchants/invitations_controller.rb).

## 5. Controllers

All page-rendering controllers inherit from
`Merchants::BaseController`
([`app/controllers/merchants/base_controller.rb`](../app/controllers/merchants/base_controller.rb)),
which gates `require_clerk_session!` + `require_merchant_user!`. Use
`PageMetadata` DSL (`with_title`, `with_breadcrumb`) for crumbs.
`current_merchant` is provided by `ApplicationController`.

### 5.1 `Merchants::HomeController` — M1 dashboard

Path: `app/controllers/merchants/home_controller.rb`.

```ruby
class Merchants::HomeController < Merchants::BaseController
  with_title "Painel"
  with_breadcrumb label: "Painel", path: -> { merchants_root_path }

  def index
    today = Time.zone.now.beginning_of_day
    week  = 1.week.ago

    visits         = current_merchant.visits
    pending_count  = current_merchant.stamps.where(status: "pending")
                                     .where("expires_at > ?", Time.current).count
    recent_visits  = visits.includes(:customer).order(created_at: :desc).limit(10)

    render inertia: {
      stats: {
        visits_today: visits.where("created_at >= ?", today).count,
        visits_week:  visits.where("created_at >= ?", week).count,
        pending_validations: pending_count
      },
      recent_activity: recent_visits.map { |v| serialize_recent(v) }
    }
  end
end
```

`serialize_recent` collapses each visit into `{ customer_name, lines:
[{ campaign_name, progress_label }] }` where `progress_label` is the
human form ("3/6", "Saldo 4 visitas") computed by walking the visit's
stamps. Keep it in a private helper or extract to a small serializer
under `app/serializers/`.

### 5.2 `Merchants::LoyaltyProgramsController` — M2 (singular resource)

Path: `app/controllers/merchants/loyalty_programs_controller.rb`.

The merchant has at most one `LoyaltyCampaign`. `show` lazily creates
a draft on first visit so the page is always renderable, and `update`
toggles enabled state plus optional reset.

```ruby
class Merchants::LoyaltyProgramsController < Merchants::BaseController
  before_action :set_loyalty_campaign

  with_title "Cartão Fidelidade"
  with_breadcrumb label: "Cartão Fidelidade",
                  path: -> { merchants_loyalty_program_path }

  def show
    render inertia: {
      loyalty_program: serialize(@loyalty),
      prizes: @loyalty.prizes.order(:position).map { |p| serialize_prize(p) }
    }
  end

  def update
    case params[:action_kind]
    when "enable"
      @loyalty.activate!  # validates ≥1 prize before flipping to active
      redirect_to merchants_loyalty_program_path, notice: "Programa ativado."
    when "disable"
      reset = ActiveModel::Type::Boolean.new.cast(params[:reset])
      @loyalty.disable!(reset: reset)
      redirect_to merchants_loyalty_program_path, notice: "Programa desativado."
    else
      head :bad_request
    end
  rescue ActiveRecord::RecordInvalid => e
    redirect_to merchants_loyalty_program_path,
                inertia: { errors: e.record.errors }
  end

  private

  def set_loyalty_campaign
    @loyalty = current_merchant.loyalty_campaign ||
      LoyaltyCampaign.create!(
        organization: current_merchant.organization,
        merchant: current_merchant,
        name: "Cartão Fidelidade",
        slug: "cartao-fidelidade",  # uniqueness scoped to org; collisions: append merchant slug
        status: "draft"
      )
  end
end
```

Activation guard: `LoyaltyCampaign#activate!` overrides the base
`activate!` to add a `prizes.exists?` check. Add it in the model rather
than the controller — see §6.

The disable path calls `LoyaltyCampaign#disable!(reset:)` directly per
[`./01-data-model.md`](./01-data-model.md). No wrapper class — the
controller speaks to the model.

### 5.3 `Merchants::LoyaltyProgram::PrizesController`

Path:
`app/controllers/merchants/loyalty_program/prizes_controller.rb`.

CRUD on prize rows scoped to the current merchant's `LoyaltyCampaign`.
Threshold required, `> 0`. Position is auto-assigned on create
(`@loyalty.prizes.maximum(:position).to_i + 1`).

```ruby
class Merchants::LoyaltyProgram::PrizesController < Merchants::BaseController
  before_action :set_loyalty
  before_action :set_prize, only: %i[edit update destroy]

  with_breadcrumb label: "Cartão Fidelidade",
                  path: -> { merchants_loyalty_program_path }

  def new
    set_title "Novo prêmio"
    render inertia: { prize: { name: "", threshold: nil } }
  end

  def create
    prize = @loyalty.prizes.build(prize_params.merge(
      position: (@loyalty.prizes.maximum(:position) || 0) + 1
    ))
    if prize.save
      redirect_to merchants_loyalty_program_path, notice: "Prêmio adicionado."
    else
      redirect_to new_merchants_loyalty_program_prize_path,
                  inertia: { errors: prize.errors }
    end
  end

  def edit
    set_title @prize.name
    render inertia: { prize: serialize(@prize) }
  end

  def update
    if @prize.update(prize_params)
      redirect_to merchants_loyalty_program_path, notice: "Prêmio atualizado."
    else
      redirect_to edit_merchants_loyalty_program_prize_path(@prize),
                  inertia: { errors: @prize.errors }
    end
  end

  def destroy
    @prize.destroy
    redirect_to merchants_loyalty_program_path, notice: "Prêmio removido."
  end

  private

  def set_loyalty
    @loyalty = current_merchant.loyalty_campaign or raise ActiveRecord::RecordNotFound
  end

  def set_prize
    @prize = @loyalty.prizes.find(params[:id])
  end

  def prize_params
    params.expect(prize: [:name, :threshold])
  end
end
```

> **Recommendation on edit-in-place vs separate routes.** Keep the
> `new`/`edit` Inertia pages defined for accessibility and direct
> linking, but the **default UX** on the loyalty program page is
> inline create/edit (see §7.3). The dedicated pages exist as fallbacks
> and for keyboard / no-JS robustness.

### 5.4 `Merchants::CampaignsController` — M3

Path: `app/controllers/merchants/campaigns_controller.rb`. Read-only
list of OrganizationCampaigns the merchant is enrolled in.

```ruby
class Merchants::CampaignsController < Merchants::BaseController
  with_title "Campanhas"
  with_breadcrumb label: "Campanhas",
                  path: -> { merchants_campaigns_path }

  def index
    campaigns = current_merchant.campaigns
                                .where(type: "OrganizationCampaign")
                                .order(starts_at: :desc)

    render inertia: {
      campaigns: campaigns.map { |c| serialize(c) }
    }
  end

  private

  def serialize(c)
    {
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      stamps_issued_here: c.stamps.confirmed.where(merchant: current_merchant).count
    }
  end
end
```

> **Critical filter detail.** `current_merchant.campaigns` walks
> `campaign_merchants` *and* the denormalized `merchant_id`, so it
> returns the merchant's own `LoyaltyCampaign` too. The
> `where(type: "OrganizationCampaign")` clause excludes it. Without
> that filter the merchant's own loyalty card would appear in this
> list — a UX bug.

### 5.5 `Merchants::ValidationsController` — M4

Path: `app/controllers/merchants/validations_controller.rb`.

```ruby
class Merchants::ValidationsController < Merchants::BaseController
  with_title "Validar código"
  with_breadcrumb label: "Validar código",
                  path: -> { new_merchants_validation_path }

  def new
    render inertia: { code: "" }
  end

  def create
    code = params.require(:code).to_s.strip
    confirmed = current_merchant.confirm_stamps(code: code)

    if confirmed.any?
      visit    = confirmed.first.visit
      customer = confirmed.first.customer
      validated_campaign_ids = confirmed.map(&:campaign_id).uniq

      render inertia: "merchants/validations/new", props: {
        success: {
          customer: serialize_customer(customer),
          campaign_progress: current_merchant.campaign_progress_for(
            customer: customer, visit: visit
          ),
          validated_campaign_ids: validated_campaign_ids
        }
      }
    else
      redirect_to new_merchants_validation_path,
                  inertia: { errors: { code: "Código inválido ou expirado." } }
    end
  end
end
```

The success render reuses the `new` page component; the page branches
on a `success` prop. Avoids a separate `success.tsx` and matches the
"Validar próximo" CTA on the wireframe (which just clears state and
returns to the input).

### 5.6 `Merchants::RedemptionsController` — M5

Path: `app/controllers/merchants/redemptions_controller.rb`.

`new` is the phone-input page. `create` branches:

- `phone` only → look up customer; if found, render the same page with
  a `preview` prop containing balance + claimable prize list. If not
  found, redirect back with an error.
- `phone` + `loyalty_prize_id` → confirm: call
  `loyalty_campaign.redeem!(customer:, prize:, by: current_user)`,
  which re-checks balance under transaction and writes the row.
  Redirect to `merchants_root_path` with a success notice; rescue
  `ActiveRecord::RecordInvalid` for the friendly error path.

```ruby
class Merchants::RedemptionsController < Merchants::BaseController
  with_title "Resgatar prêmio"
  with_breadcrumb label: "Resgatar prêmio",
                  path: -> { new_merchants_redemption_path }

  def new
    render inertia: { preview: nil }
  end

  def create
    phone = Phonelib.parse(params[:phone]).e164.presence
    return reject("Telefone inválido.") unless phone

    customer = Customer.find_by(phone: phone)
    return reject("Cliente não encontrada.") unless customer

    if params[:loyalty_prize_id].present?
      confirm(customer)
    else
      preview(customer)
    end
  end

  private

  def preview(customer)
    loyalty = current_merchant.loyalty_campaign
    return reject("Cartão Fidelidade não está ativo.") unless loyalty&.status == "active"

    balance = loyalty.balance_for(customer)
    prizes  = loyalty.prizes.order(:threshold).map do |prize|
      {
        id: prize.id,
        name: prize.name,
        threshold: prize.threshold,
        claimable: balance >= prize.threshold,
        missing: [prize.threshold - balance, 0].max
      }
    end

    render inertia: "merchants/redemptions/new", props: {
      preview: {
        customer: serialize_customer(customer),
        balance: balance,
        prizes: prizes
      }
    }
  end

  def confirm(customer)
    loyalty = current_merchant.loyalty_campaign
    prize   = loyalty.prizes.find(params[:loyalty_prize_id])

    loyalty.redeem!(customer: customer, prize: prize, by: current_user)
    redirect_to merchants_root_path, notice: "Resgate confirmado."
  rescue ActiveRecord::RecordInvalid => e
    redirect_to new_merchants_redemption_path,
                inertia: { errors: { base: e.record.errors.full_messages.to_sentence } }
  end

  def reject(msg)
    redirect_to new_merchants_redemption_path, inertia: { errors: { base: msg } }
  end
end
```

`serialize_customer` lives in `Merchants::BaseController` (or a small
concern) since both `validations` and `redemptions` use it. Returns
`{ id, name, phone }` (the phone IS the WhatsApp number; one field).

## 6. Model methods

No `app/services/`. Multi-step operations are model methods on the
record they operate on, following the project's vanilla-Rails posture
(see [Vanilla Rails is plenty](https://dev.37signals.com/vanilla-rails-is-plenty/)).
Controllers call these directly; failures surface as
`ActiveRecord::RecordInvalid` and are rescued at the controller edge.

### 6.1 `Merchant#confirm_stamps(code:)`

Atomic flip of all pending sibling stamps from one visit. **Choice:
instance method on `Merchant`** rather than class method on `Stamp`,
because every call is scoped to the current merchant and the merchant
*is* the natural subject of the verb ("merchant confirms code"). The
controller already has `current_merchant`, so `current_merchant
.confirm_stamps(code: …)` reads as a single English sentence and
keeps the merchant-scope filter implicit.

```ruby
class Merchant < ApplicationRecord
  # Returns the array of just-confirmed Stamp records (empty if no
  # match). Atomic via row lock + update_all. All sibling pending
  # stamps from the same visit share one code, so they flip together.
  def confirm_stamps(code:)
    Stamp.transaction do
      pending = stamps
        .where(status: "pending", code: code)
        .where("expires_at > ?", Time.current)
        .lock("FOR UPDATE")
        .to_a

      return [] if pending.empty?

      Stamp.where(id: pending.map(&:id)).update_all(
        status: "confirmed",
        confirmed_at: Time.current,
        code: nil,
        expires_at: nil
      )

      Stamp.where(id: pending.map(&:id)).to_a
    end
  end
end
```

> **Why `lock("FOR UPDATE")`.** Concurrent validate calls (e.g. cashier
> double-taps the button) would otherwise race the `update_all`. The
> row lock is held until the transaction commits.

### 6.2 `Merchant#campaign_progress_for(customer:, visit:)`

The validation success page needs progress lines for **all** active
campaigns at this merchant the customer touched in the originating
visit — not just the validated ones. That aggregation is a query, not a
mutation, and it belongs on the merchant because it answers the
question "what does *this merchant* now show the cashier about *this
customer*?". Keep it next to `confirm_stamps`.

```ruby
class Merchant < ApplicationRecord
  def campaign_progress_for(customer:, visit:)
    visit.stamps.includes(:campaign).map(&:campaign).uniq
      .select { |c| c.status == "active" }
      .map { |c| progress_line_for(c, customer) }
      .compact
  end

  private

  def progress_line_for(campaign, customer)
    case campaign
    when LoyaltyCampaign
      { kind: "loyalty", id: campaign.id, name: campaign.name,
        balance: campaign.balance_for(customer) }
    when OrganizationCampaign
      { kind: "organization", id: campaign.id, name: campaign.name,
        entries: campaign.entries_for(customer),
        entry_policy: campaign.entry_policy }
    end
  end
end
```

`balance_for` and `entries_for` are model APIs already specified in
[`./01-data-model.md`](./01-data-model.md); this method composes them.

### 6.3 `LoyaltyCampaign#redeem!(customer:, prize:, by:)`

Issues a redemption. Re-checks balance under transaction so a stale
preview can't issue an over-balance redemption. Raises
`ActiveRecord::RecordInvalid` on failure so the controller can use a
single rescue path — matching how Rails surfaces validation errors
elsewhere in the project.

```ruby
class LoyaltyCampaign < Campaign
  # Raises ActiveRecord::RecordInvalid on insufficient balance or wrong
  # campaign/merchant pairing. Returns the persisted Redemption on success.
  def redeem!(customer:, prize:, by:)
    transaction do
      unless prize.campaign_id == id
        errors.add(:base, "Prêmio inválido.")
        raise ActiveRecord::RecordInvalid.new(self)
      end

      balance = balance_for(customer)
      if balance < prize.threshold
        errors.add(:base, "Saldo insuficiente (#{balance} de #{prize.threshold}).")
        raise ActiveRecord::RecordInvalid.new(self)
      end

      redemptions.create!(
        customer: customer,
        prize: prize,
        merchant: merchant,
        merchant_user: by,
        threshold_snapshot: prize.threshold
      )
    end
  end
end
```

The controller (§5.6) calls `loyalty.redeem!(...)` and rescues
`ActiveRecord::RecordInvalid` for the friendly-error path.

### 6.4 Disable

No new method here. `LoyaltyCampaign#disable!(reset:)` already exists
per [`./01-data-model.md`](./01-data-model.md) and is called directly
by the controller in §5.2. If audit logging is later needed, add it
to the model method (or to a callback / concern) — not to a wrapper.

## 7. Inertia pages

All pages live under `app/frontend/pages/merchants/...` so the Inertia
component name resolves automatically from `controller_path/action`
(see CLAUDE.md "Inertia bridge"). Wrap each page bottom with:

```tsx
PageName.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>
```

Pattern matches
[`app/frontend/pages/home/index.tsx`](../app/frontend/pages/home/index.tsx)
and
[`app/frontend/pages/organizations/merchants/index.tsx`](../app/frontend/pages/organizations/merchants/index.tsx).

### 7.1 `pages/merchants/home/index.tsx` — M1

Three stat cards (`visits_today`, `visits_week`, `pending_validations`)
in a responsive grid; quick-action buttons that link to
`/merchants/validations/new` and `/merchants/redemptions/new`; a
recent-activity list rendered from `recent_activity` prop. Reuse
shadcn `Card`, `Button`. No data fetching client-side.

### 7.2 `pages/merchants/loyalty_programs/show.tsx` — M2

Three states driven by `loyaltyProgram.status`:

- `draft` — banner "Adicione ao menos 1 prêmio para ativar." Inline
  prize editor visible; ON/OFF toggle disabled with tooltip.
- `active` — toggle ON; inline prize editor visible; "Desativar…"
  button at the bottom.
- `ended` — toggle OFF and disabled; prizes shown read-only; banner
  "Programa desativado."

Disable click opens a shadcn `<Dialog>` (or `AlertDialog`) with the
two-radio choice from the wireframe (M2 disable confirmation):

- "Manter saldos atuais" → POST `/merchants/loyalty_program` with
  `action_kind=disable&reset=false`.
- "Zerar saldos" → POST `/merchants/loyalty_program` with
  `action_kind=disable&reset=true`.

Both via Inertia `useForm` so errors flow back into shared errors.

### 7.3 Inline prizes vs `loyalty_program/prizes/{new,edit}.tsx`

**Recommended:** inline editing on the show page using a small
controlled list. Each row is an editable `name` + `threshold` with a
"Salvar" button per dirty row; "Adicionar prêmio" appends a draft row
that hits `POST /merchants/loyalty_program/prizes`. The dedicated
pages still exist (mounted at the routes from §4) as
**accessibility-fallback / direct-link targets** — they do plain
`<form>` submits and don't depend on inline UI state. Don't duplicate
code: the inline component and the dedicated page share a
`<PrizeForm>` component in
`app/frontend/components/loyalty/prize-form.tsx`.

### 7.4 `pages/merchants/campaigns/index.tsx` — M3

Plain list. Each row: campaign name, a small status pill (`ATIVA` /
`ENCERRADA` / `RASCUNHO`), `stamps_issued_here`, and the date window.
No actions. Empty state copy: "Você ainda não participa de nenhuma
campanha. O administrador da sua CDL pode adicionar sua loja a uma
campanha quando ela for criada."

### 7.5 `pages/merchants/validations/new.tsx` — M4

Two visual states driven by a `success` prop:

- **Idle / error** — six numeric inputs (recommend a single
  `<input inputMode="numeric" maxLength={6} pattern="\d{6}">` with
  custom styling rather than six separate inputs; test pasted values
  flow correctly). Submit → POST `/merchants/validations`.
- **Success** — green badge "Validação aprovada", customer name, list
  of `success.campaign_progress` lines with the "(Pasaporte já estava
  em 3/6)" semantic where applicable: a line is rendered with a
  checkmark if it was newly confirmed in this validation, plain
  otherwise. The plain lines come from the **other active campaigns at
  the merchant** the customer touched in the originating visit but
  that didn't require validation (so they were already confirmed at
  scan time).

  Determining "was this line newly confirmed by this code?" comes from
  two pieces the controller already has after calling
  `current_merchant.confirm_stamps(code:)`: the returned array of
  just-confirmed `Stamp` records (their `campaign_id`s become
  `validated_campaign_ids`), and `Merchant#campaign_progress_for(...)`
  for the full active-campaign list. The page marks lines whose `id`
  is in `validatedCampaignIds` with a checkmark, others with a muted
  "(já confirmado)" tag.

A "Validar próximo" button resets the page state and refocuses the
input.

### 7.6 `pages/merchants/redemptions/new.tsx` — M5

State machine driven by `preview` prop:

- `preview === null` — phone form; submit POSTs `phone` only.
- `preview !== null` — show customer name + masked phone, current
  balance, the prize list. Each prize row is a radio button labeled
  with the prize name + threshold and either "DISPONÍVEL" or
  "Falta N". "Confirmar resgate" submits `phone` (hidden, kept across
  steps) + the chosen `loyalty_prize_id`.

Use Inertia `useForm` with an `onSuccess` reset for the phone form;
the preview form posts to the same endpoint with `loyalty_prize_id`
added.

## 8. Sidebar updates

Edit
[`app/frontend/components/app-sidebar.tsx`](../app/frontend/components/app-sidebar.tsx).
Inside the existing "Platform" `<SidebarGroup>`, after the current
"Home" item, add a `{isMerchantUser && <>...</>}` block with five
items. Use lucide-react icons that match the wireframe's tone.

| Label              | href                              | icon            |
| ------------------ | --------------------------------- | --------------- |
| Home               | `/merchants`                      | `HomeIcon`      |
| Cartão Fidelidade  | `/merchants/loyalty_program`      | `CreditCardIcon`|
| Campanhas          | `/merchants/campaigns`            | `MegaphoneIcon` |
| Validar            | `/merchants/validations/new`      | `BadgeCheckIcon`|
| Resgatar           | `/merchants/redemptions/new`      | `GiftIcon`      |

`isActive` rule: prefix-match using `url.startsWith(...)`, mirroring
the existing organizations entry. The merchant "Home" item replaces
the shared "Home" item when `isMerchantUser` is true — otherwise
the merchant sees two "Home" entries. Implementation: render either
the shared Home item (`/`) **or** the merchant Home item
(`/merchants`), gated on `isMerchantUser`.

The sidebar footer's `OrganizationSwitcher` is already correctly
hidden for merchant users
([`app-sidebar.tsx:80`](../app/frontend/components/app-sidebar.tsx)) —
do not touch that.

## 9. Shared TypeScript types

Update
[`app/frontend/types/index.ts`](../app/frontend/types/index.ts). Keep
`SharedProps` lean: only stuff that flows on every request. Page-local
shapes belong in the page file.

Add (no new shared keys are needed — `currentMerchant` is already
shared). Add a re-usable `LoyaltyProgramStatus` and `Prize` types
under a new `merchants` namespace if multiple pages reference them:

```ts
// app/frontend/types/merchants.ts
export type LoyaltyProgramStatus = "draft" | "active" | "ended"

export type LoyaltyPrize = {
  id: number
  name: string
  threshold: number
  position: number
}

export type LoyaltyProgram = {
  id: number
  status: LoyaltyProgramStatus
  effectiveFromAt: string | null
}

export type RedemptionPreviewPrize = {
  id: number
  name: string
  threshold: number
  claimable: boolean
  missing: number
}

export type CampaignProgressLine =
  | { kind: "loyalty";      id: number; name: string; balance: number }
  | { kind: "organization"; id: number; name: string; entries: number; entryPolicy: "simple" | "cumulative" }
```

Re-export from `app/frontend/types/index.ts` so consumers `import {…}
from "@/types"`. No `globals.d.ts` changes needed (no new shared
props, no new flash keys for v1; reuse `notice` / `alert`).

## 10. Tests

### 10.1 Controller / system tests (Minitest)

Place under `test/controllers/merchants/` and `test/system/`. The
existing fixtures already cover users / merchants / organizations.
Add fixtures (or factories — the project doesn't use FactoryBot, so
extend `test/fixtures/`) for `customers`, `visits`, `campaigns`,
`prizes`, `stamps`, and `redemptions`.

Required tests:

- `Merchants::HomeControllerTest`
  - non-merchant user is redirected to root.
  - merchant user gets stat counts that respect day/week boundaries.
- `Merchants::LoyaltyProgramsControllerTest`
  - first GET creates draft `LoyaltyCampaign`.
  - `update?action_kind=enable` blocks when 0 prizes; succeeds with ≥1.
  - `update?action_kind=disable&reset=true` sets `effective_from_at`.
  - `update?action_kind=disable&reset=false` leaves `effective_from_at` nil.
- `Merchants::LoyaltyProgram::PrizesControllerTest`
  - threshold required, > 0; missing rejects with errors hash.
  - position auto-increments.
  - destroy frees position re-use (positions don't have to be
    contiguous; just ordered).
- `Merchants::CampaignsControllerTest`
  - merchant sees only `OrganizationCampaign` rows where they're
    enrolled.
  - their own `LoyaltyCampaign` is **not** in the list (regression
    guard for the §5.4 critical filter).
- `Merchants::ValidationsControllerTest`
  - invalid code → `errors.code` populated.
  - expired code (past `expires_at`) → invalid.
  - happy path: all sibling stamps share one code; one POST flips all
    of them.
  - `success.campaign_progress` includes both validated and
    already-confirmed campaigns from the same visit.
  - cross-merchant safety: code from another merchant's pending stamp
    must not validate at this merchant.
- `Merchants::RedemptionsControllerTest`
  - phone-only → preview prop with claimable flags.
  - phone+prize with insufficient balance → error, no row.
  - phone+prize happy path → `Redemption` written with
    `threshold_snapshot` and `merchant_user_id`.
  - prize from another merchant's loyalty campaign → 404.

### 10.2 Model unit tests

`test/models/`:

- `MerchantTest#test_confirm_stamps_*` — happy path flips all sibling
  pending stamps to `confirmed`, clears `code` + `expires_at`, sets
  `confirmed_at`; expired stamps are not flipped; cross-merchant code
  returns `[]`; concurrency: simulate two threads calling
  `confirm_stamps` with the same code; only one flips. (Use a wrapped
  transaction + `Thread.new` with explicit DB connection checkout.
  Skipping the threaded variant is OK if Minitest threading proves
  flaky; cover the lock at the SQL level via `assert_match /FOR
  UPDATE/, query`.)
- `MerchantTest#test_campaign_progress_for_*` — returns lines for all
  active campaigns the customer touched in the visit (loyalty +
  organization), skips campaigns with `status != "active"`.
- `LoyaltyCampaignTest#test_redeem!_*` — happy path writes
  `Redemption` with `threshold_snapshot` and `merchant_user_id`;
  insufficient balance raises `ActiveRecord::RecordInvalid` and
  writes nothing; prize from another campaign raises and writes
  nothing; race-safety: artificially decrement balance between
  preview and confirm and assert the second `redeem!` raises.
- `LoyaltyCampaignTest#test_disable!_*` — `reset: true` sets
  `effective_from_at` to ~now; `reset: false` leaves it nil.

### 10.3 System tests

One end-to-end Capybara test under `test/system/merchant_flows_test.rb`
that exercises M4 + M5 with a seeded merchant + customer. Avoid
hitting Clerk in tests: stub `current_user` to return a fixture
`User` with `merchant_id` set (the existing test setup already does
this for the org admin path; reuse the pattern).

## 11. Verification — manual test plan

Plays the full happy-path end-to-end using the dev server. Assumes the
admin plan and customer plan are landed. All times Brazil-local; do
not run during DST boundary.

### 11.1 Setup

1. Org admin signs in (CDL Jaguarão), creates merchant **Calzados
   Ricardo** with slug `calzados-ricardo`, invites a merchant user
   (`pedro+merchant@example.com`).
2. Merchant user accepts the Clerk invite → on first sign-in
   `users.merchant_id` is populated from `public_metadata`.
3. Org admin creates an **OrganizationCampaign** "Compre e Ganhe" with
   `entry_policy: cumulative`, **`requires_validation: true`**,
   prizes `iPhone 15` (threshold 3) and `Smart TV` (threshold 6),
   enrolls `Calzados Ricardo`. Activates it.
4. Merchant user signs in → lands on `/merchants` → sees today=0,
   week=0, pending=0.
5. On `/merchants/loyalty_program` → toggle is OFF (draft); add three
   prizes: `Café grátis`/5, `Camiseta`/10, `Jantar para 2`/20. Toggle
   ON → status=active.

### 11.2 Customer scan → pending stamps with shared code

Customer flow lives in `05-impl-customer.md`. For verification here,
either drive it through the customer UI or simulate via curl /
Rails console:

```ruby
customer = Customer.find_or_create_by!(phone: "+59899123456") do |c|
  c.lgpd_opted_in_at = Time.current
end
ScanRegistrar.call(customer: customer, merchant: Merchant.find_by!(slug: "calzados-ricardo"))
```

Verify in the DB:

- 1 `Visit` row created.
- 2 `Stamp` rows: one for `LoyaltyCampaign` (status `confirmed`,
  no code), one for `OrganizationCampaign` "Compre e Ganhe" (status
  `pending`, `code` = 6 digits, `expires_at` ≈ now + 10min).
- *If you add a second validated campaign and re-run the scan, both
  pending stamps must carry the **same** `code`.*

### 11.3 Merchant validates code

1. Merchant user visits `/merchants/validations/new`, types the
   6-digit code.
2. POST → success page shows:
   - Customer name (or phone if no name set).
   - "Compre e Ganhe — 1/3" (newly confirmed; checkmark).
   - "Cartão Fidelidade — Saldo 1 visita" (already confirmed at scan
     time; muted "(já confirmado)" tag).
3. DB invariants: the validated stamp row has `status='confirmed'`,
   `confirmed_at` set, `code` and `expires_at` cleared.

### 11.4 Customer earns enough for a prize

Run the scan + validate cycle 4 more times so the customer reaches
**5 confirmed stamps on the loyalty campaign** (enough for `Café
grátis`).

### 11.5 Merchant initiates redemption

1. Merchant visits `/merchants/redemptions/new`.
2. Enters customer's phone → preview shows balance=5, prizes:
   - `Café grátis` 5 visitas — DISPONÍVEL (radio enabled).
   - `Camiseta` 10 visitas — Falta 5 (radio disabled).
   - `Jantar para 2` 20 visitas — Falta 15 (radio disabled).
3. Selects `Café grátis` → "Confirmar resgate" → redirects to
   `/merchants` with notice.
4. DB invariants: `Redemption(customer, campaign,
   prize=Café_grátis, merchant, merchant_user, threshold_snapshot=5)`.
5. Re-visit `/merchants/redemptions/new` → preview balance=0;
   `Café grátis` row now reads "Falta 5".

### 11.6 Disable loyalty with reset

1. Merchant visits `/merchants/loyalty_program` → "Desativar…" →
   selects "Zerar saldos" → confirm.
2. DB invariants:
   - `LoyaltyCampaign.status = 'ended'`.
   - `LoyaltyCampaign.effective_from_at ≈ Time.current`.
3. Re-visit `/merchants/redemptions/new` and look up the same
   customer → controller rejects with "Cartão Fidelidade não está
   ativo." (campaign no longer active).
4. (Re-enable is not in v1 — see §3.) But for sanity, manually flip
   `status = 'active'` in console; observe `balance_for(customer) = 0`
   because all prior stamps have `created_at <= effective_from_at`.

## 12. Open questions & recommendations

- **OrganizationCampaign redemption surface.** Out of scope here.
  Recommended path when picked up: a dedicated "Sorteios" admin
  surface where the org admin draws winners at end-of-campaign;
  merchants don't redeem org-campaign prizes themselves. Does **not**
  belong on the merchant surface.
- **Code-input UX: 1 input vs 6 inputs.** Recommend a single numeric
  input styled to look like 6 cells. The 6-cell pattern is hostile to
  paste and to autofill from SMS. The wireframe is illustrative; we
  can satisfy it with CSS/letter-spacing tricks.
- **Phone normalization on lookup.** `Phonelib.parse(...).e164` may
  return blank for malformed inputs. Recommended: also try a fallback
  with the org's default country code (Uruguay `+598` for Jaguarão)
  via an org-level setting. **Not for v1**: ship raw E.164 only and
  surface a clear "Telefone inválido" error when parse fails.
- **Auto-create draft `LoyaltyCampaign` on first GET.** Recommended
  (see §5.2) because the page would otherwise need a separate
  "Create program" action that adds noise. The auto-created draft is
  inert (status `draft`, no prizes, no stamps) until the merchant
  acts.
- **Slug collisions for `LoyaltyCampaign`** (data model: slug unique
  per organization). Recommended slug template:
  `cartao-fidelidade-#{merchant.slug}` so collisions are avoided
  organically. Implement in the auto-create branch in §5.2.
- **What "Validações pendentes" counts on M1.** Recommended:
  unique-code count of pending stamps not yet expired
  (`stamps.where(status:"pending").where("expires_at > ?",
  now).distinct.count(:code)`) — prevents inflating the number when
  a single visit has N siblings.
- **Auditing on disable + reset.** Future: write to a
  `loyalty_program_events` table from inside
  `LoyaltyCampaign#disable!` (callback or inline). v1 ships with
  model-level `update!` and Rails logs only.
- **Merchant team management on the merchant surface.** Hard to gate
  in Clerk's invitation API without role concepts. Recommended Phase
  C plan: add a single "Membros" page under `/merchants` that lists
  current `current_merchant.users` and reuses the existing
  `Organizations::Merchants::InvitationsController` flow but mounted
  at `/merchants/invitations`. Out of scope here (§3).

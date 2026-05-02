# Implementation plan — Organization user (Admin)

Companion to [`./00-overview.md`](./00-overview.md) (flow catalogue) and
[`./01-data-model.md`](./01-data-model.md) (schema/model contract).

This plan covers every flow under "Admin flows" in the overview: A1
(dashboard), A2.1–A2.6 (merchant CRUD + invitations), A3.1–A3.6
(`OrganizationCampaign` CRUD with merchant enrollment, activation, and
end transition).

It assumes the data-model migrations from `01-data-model.md` are already
landed (a parallel agent owns that). If a column or model referenced
here is missing, the data-model plan is the source of truth — update it
first, then re-run this plan.

## 1. Context

### What we're building

The admin surface is the CDL operator's home base. They need to:

- See platform health at a glance (A1).
- Manage their associate merchants — list, create, show, edit, remove,
  invite team members (A2).
- Stand up org-wide campaigns — Pasaporte de Compras and similar — pick
  the entry-policy, configure prizes, enroll merchants, activate, and
  later end the campaign (A3).

The pilot artifact (Pasaporte de Compras 2026 at CDL Jaguarão) is the
canonical campaign this surface must serve. It's an
`OrganizationCampaign` with `entry_policy: cumulative` and three prize
tiers at 6/12/18 stamps. The acceptance criterion is that the operator
can self-serve creating it end-to-end without a developer.

### What's already in place

- Namespace gate: `app/controllers/organizations/base_controller.rb`
  (`require_clerk_session!` + `require_organization_user!`).
- Existing merchant CRUD:
  `app/controllers/organizations/merchants_controller.rb` and the four
  pages under `app/frontend/pages/organizations/merchants/`. We extend,
  not rewrite.
- Existing Clerk invitation flow:
  `app/controllers/organizations/merchants/invitations_controller.rb`.
  Reused as-is.
- Inertia plumbing:
  - `app/controllers/inertia_controller.rb` — shared props (current
    user/org/merchant, title, breadcrumbs).
  - `app/controllers/concerns/page_metadata.rb` — `with_title`,
    `with_breadcrumb`, `set_title`, `add_breadcrumb`.
- Layout shell: `app/frontend/layouts/app-layout.tsx` and
  `app/frontend/components/app-sidebar.tsx`.
- Shared TS types: `app/frontend/types/index.ts`.
- Snake_case ↔ camelCase across the wire is handled by
  `inertia-caseshift` in `vite.config.ts`. We never convert manually.

## 2. Goals

When this plan is delivered:

- [ ] Organization user lands on a dashboard at `/` (A1) showing four
      headline counters and a recent-activity feed (skeleton + real
      counts; activity feed can be a stub list reading from
      `Visit.recent` or empty-state until customer flows ship — see
      Open Questions).
- [ ] `app/controllers/organizations/merchants_controller.rb` `show`
      action surfaces participating campaigns and (if exists) the
      merchant's `LoyaltyCampaign` summary (A2.3 wireframe).
- [ ] All other A2 flows continue to work unchanged; merchant `destroy`
      is reviewed against the data-model rule "loyalty deleted; unlinked
      from active org campaigns; visits/stamps preserved" (A2.5).
- [ ] `Organizations::CampaignsController` exists with full CRUD only;
      activation and termination live as their own
      `Organizations::Campaigns::ActivationsController#create` and
      `Organizations::Campaigns::TerminationsController#create`
      sub-resources (A3.1–A3.6).
- [ ] Inertia pages under `app/frontend/pages/organizations/campaigns/`
      cover `index`, `new`, `edit`, `show` and match the A3 wireframes
      including the conditional `entry_policy` form (cumulative shows a
      threshold column on prizes; simple hides threshold and exposes
      `day_cap`).
- [ ] Sidebar gains a "Campanhas" link gated on `isOrganizationUser`.
- [ ] Multi-step writes and activation guards live as model methods on
      `OrganizationCampaign` (nested-attributes for prizes, an
      `enroll_merchants` helper for the "no removal while active" rule,
      and validation contexts driving `activate!`). No `app/services/`.
- [ ] Minitest controller + system coverage for the activation guard,
      merchant-removal-blocked-while-active rule, and the
      cumulative-vs-simple form behaviour.
- [ ] All A1–A3.6 manual flows complete green per Section 12.

## 3. Out of scope

Explicitly *not* in this plan:

- The live-data shape of A1 dashboard counters and activity feed beyond
  basic SQL counts. No charts, no time-series. Real telemetry is a
  separate plan.
- Custom email templates for Clerk invitations (Clerk default is fine).
- Raffle drawing / winner selection at end of campaign — orthogonal,
  becomes its own ticket (`Campaigns::DrawWinners`).
- Customer-facing surfaces (`/s/:merchant_slug`, verification link) —
  owned by `04-impl-customer.md`.
- Merchant-user surfaces (validation, redemption, loyalty management) —
  owned by `03-impl-merchant.md` (note: filenames are confusing; the
  overview labels them `02-`/`03-`/`04-` but only this admin file has
  been spawned so far).
- Soft-delete of merchants. We do hard `destroy` for v1 and document
  the cascade rules; soft-delete revisits later.
- `LoyaltyCampaign` CRUD on the org-admin side (it lives in the
  merchant-detail surface managed by the merchant user; the admin's
  show-merchant page only *summarizes* it).
- Reactivation of an ended OrganizationCampaign. Per data model,
  ending is terminal in v1.
- Slug editability conflicts (we accept slug edits but don't break old
  URLs — covered in data-model "old QRs already printed" note;
  out-of-scope here).

## 4. Routes

Append to the existing `namespace :organizations` block in
`config/routes.rb`. Do not touch the `merchants` block or its nested
`invitations` resource.

```ruby
namespace :organizations do
  resources :merchants do
    resources :invitations, only: :create, module: :merchants
  end

  resources :campaigns do
    # State transitions modeled as their own sub-resources, RESTfully.
    # See "RESTful controllers only" in CLAUDE.md.
    resource :activation,  only: :create, module: :campaigns
    resource :termination, only: :create, module: :campaigns
  end
end
```

Activate and end-campaign transitions live as their own
`Organizations::Campaigns::ActivationsController` and
`Organizations::Campaigns::TerminationsController` (per the
nested-module convention), each exposing only `#create`. This avoids
custom action verbs on `Organizations::CampaignsController`, keeps the
parent controller strictly CRUD, and sidesteps the `def end` Ruby
keyword problem.

Resulting paths:

```
GET    /organizations/campaigns                       → CampaignsController#index
GET    /organizations/campaigns/new                   → CampaignsController#new
POST   /organizations/campaigns                       → CampaignsController#create
GET    /organizations/campaigns/:id                   → CampaignsController#show
GET    /organizations/campaigns/:id/edit              → CampaignsController#edit
PATCH  /organizations/campaigns/:id                   → CampaignsController#update
DELETE /organizations/campaigns/:id                   → CampaignsController#destroy
POST   /organizations/campaigns/:campaign_id/activation  → Campaigns::ActivationsController#create
POST   /organizations/campaigns/:campaign_id/termination → Campaigns::TerminationsController#create
```

`destroy` is allowed only when `status: 'draft'`. Active or ended
campaigns can't be deleted (preserves audit trail). Enforced in the
controller, not via a `:only` constraint.

## 5. Controllers

All controllers below inherit from `Organizations::BaseController` (which
itself inherits from `InertiaController`). They get
`require_clerk_session!` + `require_organization_user!` for free.

### 5.1 `Organizations::DashboardController` — recommend extending `HomeController`

Recommendation: **don't add a new controller**. The existing
`HomeController` is already mounted at `root '/'` and inherits from
`InertiaController`. For an organization user, the home page renders
`pages/home/index.tsx` which becomes the admin dashboard. The
controller branches on persona:

`app/controllers/home_controller.rb`:

```ruby
class HomeController < InertiaController
  before_action :require_clerk_session!

  with_title "Home"
  with_breadcrumb label: "Home", path: -> { root_path }

  def index
    if current_user&.organization_id.present?
      render_organization_dashboard
    elsif current_user&.merchant_id.present?
      render_merchant_dashboard  # owned by merchant-impl plan
    else
      render inertia: {}
    end
  end

  private

  def render_organization_dashboard
    org = current_organization
    render inertia: "home/index", props: {
      dashboard: {
        merchant_count: org.merchants.count,
        active_campaign_count: org.campaigns.active.count,
        # Deferred until customer flows land — return 0/empty for now:
        customer_count: 0,
        visits_today_count: 0,
        recent_activity: []
      }
    }
  end
end
```

Frontend component branches off `currentUser.organizationId` to render
the admin layout (Section 7.1). Keeping one home page avoids a redirect
hop on sign-in.

### 5.2 `Organizations::MerchantsController` — extend `show`

Existing file: `app/controllers/organizations/merchants_controller.rb`.

Changes:

- `show` action gets two extra props:
  - `loyalty_campaign` — summary of the merchant's `LoyaltyCampaign` if
    it exists (`{ id, name, status, prize_count, active_customer_count }`,
    plus a `manage_url` deep-linking to the merchant-side surface).
    Returns `nil` if none exists.
  - `participating_campaigns` — `OrganizationCampaign`s this merchant is
    enrolled in via `campaign_merchants`, scoped to active + ended (no
    drafts visible from the merchant view).
- New private serializers `serialize_loyalty(c)` and
  `serialize_participating(c)` to keep the action thin.

Sketch:

```ruby
def show
  set_title @merchant.name
  add_breadcrumb label: @merchant.name, path: organizations_merchant_path(@merchant)

  render inertia: {
    merchant: serialize(@merchant),
    members: @merchant.users.order(:email).map { |u| serialize_user(u) },
    loyalty_campaign: serialize_loyalty(@merchant.loyalty_campaign),
    participating_campaigns: @merchant.organization_campaigns
                                      .where(status: %w[active ended])
                                      .order(starts_at: :desc)
                                      .map { |c| serialize_participating(c) }
  }
end
```

`Merchant#loyalty_campaign` and `Merchant#organization_campaigns` are
associations to add in `app/models/merchant.rb` (the data-model plan
owns the schema; this plan owns the AR associations on the merchant
model):

```ruby
has_one :loyalty_campaign
has_many :campaign_merchants, dependent: :destroy
has_many :organization_campaigns, through: :campaign_merchants, source: :campaign
```

`destroy` action behaviour for A2.5:

- The data-model plan establishes `dependent: :destroy` on `prizes`,
  `stamps`, `redemptions` from `Campaign`, and `campaign_merchants`
  from `OrganizationCampaign`. Visits belong to merchants but with
  `belongs_to :merchant`, so we need to think.
- **Recommendation**: hard-delete the merchant. Cascade:
  - The merchant's `LoyaltyCampaign` is destroyed (`dependent: :destroy`
    on `Merchant#loyalty_campaign`).
  - `campaign_merchants` rows are destroyed (the merchant disappears
    from any active org campaign's roster — this is the "removed mid-flight"
    case the data model says is forbidden once active. We make `destroy`
    refuse if the merchant is on any `active` campaign; operator must end
    the campaign first or wait it out).
  - Visits + stamps stay because `dependent: :destroy` is **not** set
    on `Merchant#visits`. Set `dependent: :nullify` instead (or no-op
    and orphan; recommend nullify with a `merchant_id` nullable on
    visits — but this contradicts the data model's `null: false`. **Open
    question, see Section 13.**).

For now, the safest behaviour: refuse `destroy` if the merchant has
any visits OR is on any active campaign, and surface a flash error.
Operators delete only freshly-created merchants in practice; the
realistic action for an established merchant is "remove from active
campaigns by ending them".

```ruby
# Controller
def destroy
  if @merchant.destroy
    redirect_to organizations_merchants_path, notice: "Merchant deleted."
  else
    redirect_to organizations_merchants_path, alert: "Cannot delete a merchant with visit history or active campaign membership."
  end
end

# Merchant model
before_destroy :check_for_visits_and_active_campaigns

private

def check_for_visits_and_active_campaigns
  if visits.exists? || active_campaign_memberships.exists?
    errors.add(:base, "Cannot delete a merchant with visit history or active campaign membership.")
    throw(:abort)
  end
end
```

### 5.3 `Organizations::Merchants::InvitationsController` — reused

No changes. Already covers A2.6.

### 5.4 `Organizations::CampaignsController` — new

`app/controllers/organizations/campaigns_controller.rb`:

```ruby
# frozen_string_literal: true

class Organizations::CampaignsController < Organizations::BaseController
  before_action :set_campaign, only: %i[show edit update destroy]

  with_breadcrumb label: "Campanhas", path: -> { organizations_campaigns_path }

  def index
    set_title "Campanhas"

    scope = current_organization.organization_campaigns
    scope = scope.where(status: params[:status]) if params[:status].present?

    render inertia: {
      campaigns: scope.order(created_at: :desc).map { |c| serialize_summary(c) },
      filter: params[:status]
    }
  end

  def show
    set_title @campaign.name
    add_breadcrumb label: @campaign.name, path: organizations_campaign_path(@campaign)

    render inertia: { campaign: serialize_full(@campaign) }
  end

  def new
    set_title "Nova campanha"
    add_breadcrumb label: "Nova", path: new_organizations_campaign_path

    render inertia: {
      campaign: blank_campaign_payload,
      merchants: current_organization.merchants.order(:name).map { |m| { id: m.id, name: m.name } }
    }
  end

  def create
    @campaign = current_organization.organization_campaigns.build
    @campaign.assign_attributes(campaign_params)

    if @campaign.save
      redirect_to organizations_campaign_path(@campaign), notice: "Campanha criada."
    else
      redirect_to new_organizations_campaign_path, inertia: { errors: @campaign.errors }
    end
  end

  def edit
    set_title @campaign.name
    add_breadcrumb label: @campaign.name, path: organizations_campaign_path(@campaign)
    add_breadcrumb label: "Editar", path: edit_organizations_campaign_path(@campaign)

    render inertia: {
      campaign: serialize_full(@campaign),
      merchants: current_organization.merchants.order(:name).map { |m| { id: m.id, name: m.name } }
    }
  end

  def update
    @campaign.assign_attributes(campaign_params)

    if @campaign.save
      redirect_to organizations_campaign_path(@campaign), notice: "Campanha atualizada."
    else
      redirect_to edit_organizations_campaign_path(@campaign), inertia: { errors: @campaign.errors }
    end
  end

  def destroy
    # This check should actually me done in the before_destroy callback on the model
    unless @campaign.draft?
      return redirect_to organizations_campaigns_path,
        alert: "Apenas campanhas em rascunho podem ser excluídas."
    end
    @campaign.destroy
    redirect_to organizations_campaigns_path, notice: "Campanha excluída."
  end

  private

  def set_campaign
    @campaign = current_organization.campaigns
                                    .where(type: "OrganizationCampaign")
                                    .find(params[:id])
  end

  def campaign_params
    params.expect(
      campaign: [
        :name,
        :slug,
        :starts_at,
        :ends_at,
        :entry_policy,
        :requires_validation,
        :day_cap,
        { merchant_ids: [],
          prizes_attributes: [[:id, :name, :threshold, :position, :_destroy]] }
      ]
    )
  end

  def blank_campaign_payload
    {
      name: "",
      slug: "",
      starts_at: nil,
      ends_at: nil,
      entry_policy: "cumulative",
      requires_validation: false,
      day_cap: nil,
      status: "draft",
      merchant_ids: [],
      prizes: []
    }
  end

  def serialize_summary(c)
    {
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      entry_policy: c.entry_policy,
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      merchant_count: c.merchants.size,
      stamp_count: c.stamps.confirmed.size
    }
  end

  def serialize_full(c)
    {
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      entry_policy: c.entry_policy,
      requires_validation: c.requires_validation,
      day_cap: c.day_cap,
      merchant_ids: c.merchants.pluck(:id),
      prizes: c.prizes.order(:position).map { |p|
        { id: p.id, name: p.name, threshold: p.threshold, position: p.position }
      }
    }
  end
end
```

Notes on params:

- Prize create/update/destroy diffing is handled by Rails'
  `accepts_nested_attributes_for :prizes, allow_destroy: true` on
  `OrganizationCampaign` (see §6). The controller does
  `assign_attributes` + `save` and lets Active Record do the work.
- `merchant_ids` is permitted as an array of uuids; the existing
  `has_many :merchants, through: :campaign_merchants` association
  natively supports `campaign.merchant_ids = [...]`. The "no removal
  while active" rule lives on the model, not in the controller.
- The "no prize destroy after first stamp" rule is enforced as a
  model-level `before_destroy` on `Prize` (or via a validation on
  the parent during nested-attributes processing). Either way, the
  controller is unchanged.

Error handling: every failure path goes back to the originating page
with `inertia: { errors: ... }`. This matches the existing
`MerchantsController` pattern. The frontend reads `form.errors["..."]`
and renders inline.

Title/breadcrumb: class-level `with_breadcrumb` for the persistent
"Campanhas" crumb; per-action `set_title` + `add_breadcrumb` for the
detail crumbs.

### 5.5 `Organizations::Campaigns::ActivationsController` — new

Sub-resource controller responsible for the draft → active state
transition. Strictly RESTful: only `#create`. The form submitting here
is the "Ativar campanha" button on the show page.

```ruby
# frozen_string_literal: true

class Organizations::Campaigns::ActivationsController < Organizations::BaseController
  before_action :set_campaign

  def create
    if @campaign.activate!
      redirect_to organizations_campaign_path(@campaign), notice: "Campanha ativada."
    else
      redirect_to organizations_campaign_path(@campaign), inertia: { errors: @campaign.errors }
    end
  end

  private

  def set_campaign
    @campaign = current_organization.organization_campaigns.find(params[:campaign_id])
  end
end
```

File path: `app/controllers/organizations/campaigns/activations_controller.rb`.

### 5.6 `Organizations::Campaigns::TerminationsController` — new

Active → ended transition, same shape as activation. The Ruby keyword
collision with `end` is sidestepped automatically by naming the
resource `termination`.

```ruby
# frozen_string_literal: true

class Organizations::Campaigns::TerminationsController < Organizations::BaseController
  before_action :set_campaign

  def create
    @campaign.end!
    redirect_to organizations_campaign_path(@campaign), notice: "Campanha encerrada."
  end

  private

  def set_campaign
    @campaign = current_organization.organization_campaigns.find(params[:campaign_id])
  end
end
```

File path: `app/controllers/organizations/campaigns/terminations_controller.rb`.

The shared `set_campaign` helper between the two sub-controllers can be
extracted into a small `Organizations::Campaigns::CampaignScoped`
concern if a third sub-controller appears; not needed for v1.

## 6. Model methods and concerns

Per the project's "vanilla Rails is plenty" stance, the multi-step
writes and the activation guard live on `OrganizationCampaign` itself,
using Rails built-ins (nested attributes, `has_many :through`,
validation contexts). No `app/services/`. No `ServiceResult`. Active
Record's `errors` + boolean returns are sufficient.

### 6.1 Nested writes (replaces `Sync`)

On `app/models/organization_campaign.rb`:

```ruby
class OrganizationCampaign < Campaign
  has_many :prizes, foreign_key: :campaign_id, dependent: :destroy
  has_many :campaign_merchants, foreign_key: :campaign_id, dependent: :destroy
  has_many :merchants, through: :campaign_merchants

  accepts_nested_attributes_for :prizes, allow_destroy: true

  before_validation :null_out_thresholds_for_simple_policy
  before_validation :prevent_merchant_removal_when_active

  # ...
end
```

What this gives you, for free:

- **Prize CRUD diffing** — `prizes_attributes: [{id:, name:, threshold:,
  position:, _destroy:}]` is processed by Rails: rows with `id` update,
  rows without `id` create, rows with `_destroy: true` destroy. The
  controller just calls `@campaign.assign_attributes(campaign_params)`
  + `@campaign.save`.
- **Merchant enrollment** — the `has_many :through` association makes
  `campaign.merchant_ids = [...]` a built-in setter that diffs the
  join rows.

Two model-level hooks cover the policy rules:

```ruby
private

# Defense in depth: simple-policy campaigns must not carry thresholds,
# even if a stale form posts one.
def null_out_thresholds_for_simple_policy
  return unless entry_policy == "simple"
  prizes.each { |p| p.threshold = nil }
end

# Adds always allowed; removes only when draft. On an active campaign,
# any attempt to drop a merchant short-circuits with a base error and
# leaves the join rows untouched.
def prevent_merchant_removal_when_active
  return unless persisted? && active?
  current_ids = campaign_merchants.reject(&:marked_for_destruction?).map(&:merchant_id)
  removed_ids = merchants_was_ids - current_ids
  return if removed_ids.empty?
  errors.add(:base, "Não é possível remover lojistas de uma campanha ativa.")
  throw(:abort)
end

def merchants_was_ids
  @merchants_was_ids ||= campaign_merchants.where.not(id: nil).pluck(:merchant_id)
end
```

Alternative (more explicit) shape if a callback feels too magic: expose
`OrganizationCampaign#enroll_merchants(ids)` that performs the same
guard imperatively, and have the controller call it after `save`. Either
is acceptable; the callback version is the default because it lets a
single `assign_attributes` + `save` round-trip through normal Rails
form semantics. Pick one and stick with it.

### 6.2 Lifecycle (activate + end) as a single-model concern

The lifecycle of an `OrganizationCampaign` — `draft → active → ended`
— is one cohesive feature: the activation guards, the `activate!`
orchestrator, and the matching `end!` transition. Both transitions
belong together; isolating them in their own concern names the trait
("the campaign has a lifecycle") and keeps the surface area of
`OrganizationCampaign` tidy. Per the CLAUDE.md "single-model concern"
convention, it lives at `app/models/organization_campaign/activatable.rb`
namespaced under the model:

```ruby
# app/models/organization_campaign/activatable.rb
module OrganizationCampaign::Activatable
  extend ActiveSupport::Concern

  included do
    validate :prizes_present_for_activation,            on: :activation
    validate :all_prizes_have_threshold_for_activation, on: :activation
    validate :merchants_present_for_activation,         on: :activation
  end

  # Flip draft → active. Returns false (and populates errors) on guard
  # failure. Activating a non-draft campaign is a no-op that returns
  # false; the controller surfaces an error in that case.
  def activate!
    return false unless draft?
    return false unless valid?(:activation)
    update!(status: "active")
  end

  # Flip active → ended. Idempotent on already-ended campaigns; returns
  # false on draft (you end after activating, not before).
  def end!
    return false unless active?
    update!(status: "ended")
  end

  private

  def prizes_present_for_activation
    errors.add(:prizes, "É necessário ao menos um prêmio.") if prizes.empty?
  end

  def all_prizes_have_threshold_for_activation
    return unless entry_policy == "cumulative"
    return if prizes.all? { |p| p.threshold.to_i.positive? }
    errors.add(:prizes, "Todos os prêmios precisam de marco (>0) em campanhas acumulativas.")
  end

  def merchants_present_for_activation
    errors.add(:merchants, "É necessário ao menos um lojista.") if merchants.empty?
  end
end
```

`OrganizationCampaign` includes it:

```ruby
class OrganizationCampaign < Campaign
  include Activatable
  # ...
end
```

The controllers (§5.5 / §5.6) become just:

```ruby
# Activations#create
if @campaign.activate!
  redirect_to organizations_campaign_path(@campaign), notice: "Campanha ativada."
else
  redirect_to organizations_campaign_path(@campaign), inertia: { errors: @campaign.errors }
end

# Terminations#create
if @campaign.end!
  redirect_to organizations_campaign_path(@campaign), notice: "Campanha encerrada."
else
  redirect_to organizations_campaign_path(@campaign), alert: "Apenas campanhas ativas podem ser encerradas."
end
```

`LoyaltyCampaign` doesn't share these transitions: it stays "active"
until the merchant calls its own `disable!(reset:)` (a separate domain
concept defined in the data-model plan). So `Campaign` base no longer
defines `activate!` or `end!` — they live on the lifecycle concern,
mixed only into the subclass that has this lifecycle.

### 6.3 Why namespace the concern under `OrganizationCampaign`

Two notes on placement:

- **Single-model scope** — only `OrganizationCampaign` uses these
  activation guards today. They encode policy-specific rules
  (`entry_policy == "cumulative"` ⇒ thresholds required; merchant
  enrollment required; etc.) that don't translate to LoyaltyCampaign or
  any other future subclass. Per CLAUDE.md, single-model concerns live
  under the model's namespace, not at `app/models/concerns/`.
- **If a second activator appears** — say, a future `RaffleCampaign`
  with similar but not identical activation guards — generalize at that
  point: rename to `Campaign::Activatable` and move the file to
  `app/models/campaign/activatable.rb`, keeping the type-specific guards
  on the subclasses themselves. Don't anticipate the generalization
  before the second use case exists.

(Cross-model cousin: `Sluggable` from the data-model plan lives at
`app/models/concerns/sluggable.rb` because it's shared by `Organization`,
`Merchant`, and `Campaign`.)

## 7. Inertia pages

All page components opt into the shell with
`Foo.layout = (page) => <AppLayout>{page}</AppLayout>` (matching
existing pattern). All in-app navigation uses Inertia `<Link>` (not
`<a>`) so SPA visits don't re-mount the shell.

### 7.1 `app/frontend/pages/home/index.tsx` (already exists; extend)

Branch on `currentUser.organizationId`. When org user, render the four
counter cards (A1 wireframe) using props injected by the controller:

```tsx
const { dashboard } = props
// merchant_count, active_campaign_count, customer_count, visits_today_count, recent_activity
```

Card layout: shadcn `<Card>` 4-column grid on desktop, stacks on
mobile. Recent-activity rendered as a divided list; empty-state shows
"Sem atividade ainda."

### 7.2 `app/frontend/pages/organizations/merchants/{index,new,edit}.tsx`

No structural changes. `index` is fine. `new` and `edit` may gain a
slug input when the data-model plan adds the `slug` column — at that
point, accept slug in the form (auto-suggest on blur of name; user
editable).

### 7.3 `app/frontend/pages/organizations/merchants/show.tsx` (extend)

Add three sections after Members:

- **Cartão Fidelidade** — if `loyaltyCampaign` is non-null, render a
  summary card with `[Configurar / desativar]` button linking to the
  merchant-side surface (which the merchant impl plan will own — for
  now the link can target a TODO route).
- **Campanhas (organização) participando** — list rows showing
  `name · status pill · until ends_at`. Each row links to the campaign
  show page.
- **Visitas recentes** — placeholder until customer flows ship; render
  empty-state.

### 7.4 `app/frontend/pages/organizations/campaigns/index.tsx`

```
A3.1 wireframe.
```

- Status filter pills above the list (All / Draft / Active / Ended).
  Filter is a query param `?status=`. Each pill is an Inertia `<Link>`
  preserving scroll.
- Each row: name (linked to show), status pill, summary line
  ("6 lojistas · 347 stamps · até 31/12").
- Top-right: `[+ Nova]` `<Link href="/organizations/campaigns/new">`.

Empty-state: "Nenhuma campanha ainda" + CTA.

### 7.5 `app/frontend/pages/organizations/campaigns/new.tsx`

The full A3.2 form. See the wireframe in
[`./00-overview.md`](./00-overview.md#a32-create-organizationcampaign).

Form state model — recommend a single `useForm`:

```tsx
const form = useForm({
  campaign: {
    name: "",
    slug: "",
    starts_at: "",
    ends_at: "",
    entry_policy: "cumulative" as EntryPolicy,
    requires_validation: false,
    day_cap: null as number | null,
    merchant_ids: [] as number[],
    prizes_attributes: [] as PrizeInput[],
  }
})
```

Conditional rendering rules:

- `entry_policy === "cumulative"`:
  - Hide the `day_cap` block.
  - Prize rows show a `Stamps` column (numeric input) + `Nome`.
  - Validation: stamps required, > 0.
- `entry_policy === "simple"`:
  - Show the `day_cap` block — radio "Sem limite" vs "[N] entrada(s)
    por dia". When the second option is selected, `day_cap` is a
    positive integer.
  - Prize rows hide `Stamps`. On switch from cumulative→simple, blank
    out prize thresholds in form state.

Prize list management:

- `+ Adicionar prêmio` appends a row with sequential `position`.
- `[Remover]` marks the row for removal:
  - If row has an `id`, set `_destroy: true` and hide visually (the
    server-side sync interprets this).
  - If row is unsaved, splice it out.

Slug auto-suggest: on `onBlur` of name, if `slug` is blank, run a
client-side slugify and populate. User can override.

Submit posts to `POST /organizations/campaigns` with the entire
`form.data.campaign`. Inertia handles the case-shift to snake on the
wire automatically.

### 7.6 `app/frontend/pages/organizations/campaigns/edit.tsx`

Same form as `new`, pre-filled from the `campaign` prop. PATCH to
`/organizations/campaigns/:id`.

Disable rules when `status === "active"`:

- `entry_policy`, `starts_at`, `requires_validation`, `day_cap`
  read-only (rendered as static text with a small "Encerre a campanha
  para alterar" tooltip).
- `name`, `slug`, `ends_at` editable (you can extend a campaign).
- Prize rows: editable name, but `[Remover]` disabled on rows that
  have stamps against them. Adding new prizes is allowed.
- Merchant multi-select: adds allowed; removing a checked merchant
  shows an inline warning "Para remover, encerre a campanha." The
  server is the source of truth and will reject the removal.

Disable rules when `status === "ended"`: everything read-only.

### 7.7 `app/frontend/pages/organizations/campaigns/show.tsx`

A3.3 layout:

- Status pill (`DRAFT / ATIVA / ENCERRADA`).
- Two-column header: campaign meta on the left (window, entry policy,
  validation flag), merchant chips on the right.
- Prize ladder — list of prizes in `position` order with threshold (or
  no threshold for simple).
- Stats row — # stamps, # completions, # entries (computed server-side
  via `serialize_full` extension once flows ship; for now show
  totals).
- Action footer:
  - `draft` → `[ Editar ]` `[ Ativar ]` `[ Excluir ]`
  - `active` → `[ Editar ]` `[ Encerrar ]`
  - `ended` → `[ Ver detalhes ]` (everything read-only)
- The activate / end / destroy buttons use Inertia's
  `<Link method="post" as="button" href="...">` pattern matching the
  existing destroy in `merchants/index.tsx`. Activate posts to
  `/organizations/campaigns/:id/activation`; End posts to
  `/organizations/campaigns/:id/termination`.

## 8. Sidebar updates

`app/frontend/components/app-sidebar.tsx`:

- Add `MegaphoneIcon` to the `lucide-react` import.
- Add a new `<SidebarMenuItem>` under the existing `isOrganizationUser`
  block (after Merchants):

```tsx
{isOrganizationUser && (
  <SidebarMenuItem>
    <SidebarMenuButton
      asChild
      tooltip="Campanhas"
      isActive={url.startsWith("/organizations/campaigns")}
    >
      <Link href="/organizations/campaigns">
        <MegaphoneIcon />
        <span>Campanhas</span>
      </Link>
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

The two org-only items (Merchants, Campanhas) sit under the existing
"Platform" group.

## 9. Shared TypeScript types

Add to `app/frontend/types/index.ts`:

```ts
export type EntryPolicy = "simple" | "cumulative"
export type CampaignStatus = "draft" | "active" | "ended"

export type Prize = {
  id: number | null  // null on unsaved rows
  name: string
  threshold: number | null  // null for simple
  position: number
}

export type PrizeInput = Prize & { _destroy?: boolean }

export type Campaign = {
  id: number
  name: string
  slug: string
  status: CampaignStatus
  startsAt: string | null
  endsAt: string | null
  entryPolicy: EntryPolicy
  requiresValidation: boolean
  dayCap: number | null
  merchantIds: number[]
  prizes: Prize[]
}

export type CampaignSummary = {
  id: number
  name: string
  slug: string
  status: CampaignStatus
  entryPolicy: EntryPolicy
  startsAt: string | null
  endsAt: string | null
  merchantCount: number
  stampCount: number
}
```

`SharedProps` itself is unchanged.

## 10. Inertia shared props

No additions needed in `InertiaController`. The dashboard counters are
per-page props (passed by `HomeController#index`), not shared. Adding
them as `inertia_share` would compute counts on every request,
including those that never render the dashboard.

If A1 grows a global "active-campaign banner" surface later, that's
when it earns a shared prop. Not now.

## 11. Tests

Target — Minitest (Rails default). Files to add:

### Controller tests

- `test/controllers/organizations/campaigns_controller_test.rb`
  - `test_index_lists_only_organization_campaigns_for_current_org`
  - `test_create_with_valid_payload_persists_campaign_and_prizes_and_merchants`
  - `test_create_simple_with_day_cap_persists_day_cap`
  - `test_create_invalid_redirects_with_errors`
  - `test_update_blocks_merchant_removal_when_active`
  - `test_destroy_blocks_when_not_draft`

- `test/controllers/organizations/campaigns/activations_controller_test.rb`
  - `test_create_succeeds_with_prize_and_merchant`
  - `test_create_blocks_when_no_prize`
  - `test_create_blocks_when_cumulative_prize_missing_threshold`
  - `test_create_blocks_when_no_merchant`

- `test/controllers/organizations/campaigns/terminations_controller_test.rb`
  - `test_create_transitions_status_from_active_to_ended`

- `test/controllers/organizations/merchants_controller_test.rb`
  (extend if exists; create if not)
  - `test_show_includes_loyalty_campaign_summary_when_present`
  - `test_show_includes_participating_campaigns`
  - `test_destroy_blocks_when_merchant_has_visits`

### Model tests

`test/models/organization_campaign_test.rb` — owned by this plan, this
is where the multi-step write logic and activation guards are
exercised:

- `test_activate_succeeds_with_prize_and_merchant`
- `test_activate_blocks_when_no_prize`
- `test_activate_blocks_when_cumulative_prize_missing_threshold`
- `test_activate_blocks_when_no_merchant`
- `test_activate_returns_false_when_not_draft`
- `test_nested_prizes_attributes_create_update_and_destroy`
- `test_simple_policy_nulls_out_incoming_thresholds`
- `test_merchant_ids_setter_adds_when_draft`
- `test_merchant_removal_blocked_when_active`
- `test_merchant_addition_allowed_when_active`

Other model coverage (`Campaign#end!`, `LoyaltyCampaign#balance_for`,
entry-policy branching validations, etc.) belongs to the data-model
plan; cite them here as prerequisites.

### System tests

- `test/system/organizations/campaigns_test.rb`
  - Operator creates a cumulative campaign with three prize tiers,
    enrolls two merchants, saves as draft, then activates it. Asserts
    the success notice and the status pill flips on show.
  - Operator switches a draft from cumulative → simple in the edit
    form: prize rows lose the threshold column, day_cap controls
    appear. Saves, reloads, state is preserved.
  - Activation fails with an inline error when prizes empty.

System tests can leverage existing Capybara/Selenium setup
(`bin/rails test:system`).

## 12. Verification — manual test plan

Run against the dev environment (`bin/dev`). Sign in as an org user
attached to an Organization with at least three Merchants seeded.

### 12.1 A1 — Dashboard

1. Navigate to `/`.
2. Confirm four counter cards render with current numbers (visit and
   customer counters may be 0 until customer flows ship).
3. Confirm sidebar shows "Home", "Merchants", "Campanhas". Confirm
   "Campanhas" is hidden when signed in as a merchant user.

### 12.2 A2.1–A2.5 — Merchant CRUD

1. `/organizations/merchants` — list renders.
2. `+ Novo lojista` → create "Test Merchant Alpha" → redirected to
   list, new merchant visible.
3. Click merchant row → show page renders with empty Members,
   "Cartão Fidelidade" empty state, "Campanhas participando" empty.
4. Edit → rename → save → verify list updates.
5. Delete (a fresh, history-free merchant) → success.
6. Try to delete a merchant with visits → blocked with flash.

### 12.3 A2.6 — Invitations

1. From show page, send a Clerk invitation. Verify the email is
   delivered (Clerk dashboard → Invitations) and `public_metadata`
   contains `merchant_id`.

### 12.4 A3.2 — Create cumulative campaign (Pasaporte de Compras 2026)

1. Sidebar → Campanhas → `+ Nova`.
2. Fill: name "Pasaporte de Compras 2026", slug auto-suggests
   "pasaporte-de-compras-2026", window 2026-04-01 → 2026-12-31.
3. Tipo: ◉ Acumulativa (default).
4. Leave `requires_validation` unchecked.
5. Add three prizes: (6, "iPhone 15"), (12, "Smart TV 55""), (18,
   "Vale-compras R$ 500"). Reorder by drag if implemented; otherwise
   skip.
6. Tick two merchants.
7. Salvar como rascunho → land on show.
8. DB sanity:
   ```
   c = OrganizationCampaign.last
   c.status # => "draft"
   c.entry_policy # => "cumulative"
   c.prizes.pluck(:threshold) # => [6, 12, 18]
   c.merchants.size # => 2
   c.day_cap # => nil
   ```
9. Click `[ Ativar ]` → success notice. Status pill → ATIVA.
   `c.reload.status` is `"active"`.

### 12.5 A3.2 alt — Create simple campaign with day_cap: 1

1. Sidebar → Campanhas → `+ Nova`.
2. Fill window + name. Tipo: ◯ Simples.
3. day_cap UI appears. Pick "1 entrada por dia".
4. Add one prize: (no stamps column) "iPhone 15".
5. Tick one merchant. Save.
6. Activate. DB: `c.day_cap == 1`, `c.entry_policy == "simple"`,
   `c.prizes.first.threshold == nil`.

### 12.6 A3 activation guards

1. Create a cumulative campaign with no prizes → activate → expect
   inline error "É necessário ao menos um prêmio."
2. Add a prize with threshold blank → activate → expect "Todos os
   prêmios precisam de marco (>0)..."
3. Add threshold; remove all merchants → activate → expect "É
   necessário ao menos um lojista."
4. Add merchant → activate succeeds.

### 12.7 A3.4 — Edit active campaign

1. Open the active Pasaporte campaign in `/edit`.
2. Try to uncheck a merchant → save → server returns error "Não é
   possível remover lojistas de uma campanha ativa." Frontend keeps
   merchant checked.
3. Check an additional merchant (Café Central) → save → succeeds.
   `c.merchants.size` increments.
4. Edit prize name (not threshold) → save → succeeds.
5. Reduce a prize's threshold → save → recommend allowed only when
   no stamps exist for the campaign yet (Open Question 13.5).

### 12.8 A3.5 — End campaign

1. From show, `[ Encerrar ]` → confirm dialog → confirm → status flips
   to ENCERRADA. `c.reload.status == "ended"`. Edit form is read-only.

### 12.9 A3.6 — Merchant participation visible from merchant detail

1. Open a merchant enrolled in the active campaign.
2. Verify "Campanhas (organização) participando" lists Pasaporte de
   Compras 2026 with status pill ATIVA.

## 13. Open questions (with recommendations)

### 13.1 Where does the dashboard live — `/` or `/organizations/dashboard`?

**Recommendation**: keep it at `/` and branch in `HomeController`. Less
controller surface, no redirect on sign-in. Spelled out in 5.1.

### 13.2 Soft-delete vs hard-delete for merchants

**Recommendation**: hard-delete for v1, but only when the merchant has
no visits and no active-campaign membership. Defer soft-delete until
we hit a real need (e.g., a merchant churns mid-pilot but their stamp
history must remain queryable from the campaign side).

### 13.3 Reactivation of an ended campaign

The data model says "ending is terminal". The UI should not show an
"Ativar" button on ended campaigns.

**Recommendation**: hard-block in `OrganizationCampaign#activate!`
(it already returns `false` unless `draft?`). UI hides the button. If
reactivation is ever needed, it's a new ticket and a `reopen!`
transition method.

### 13.4 Prize threshold edits on active campaigns

Reducing a threshold mid-flight could retroactively make customers
eligible (good if intended; surprising if not). Increasing it could
strand customers who already qualified.

**Recommendation** for v1:

- While `draft`: any edit allowed.
- While `active`: name editable; threshold and prize destroy allowed
  *only* if no stamps exist on that campaign yet. Once stamps exist,
  threshold is locked. Surfaced as an inline warning in the edit
  form.

This matches the wireframe text "no changing dates/prizes after at
least one stamp issued" in A3.4. A model-level validation on
`OrganizationCampaign` (and a `before_destroy` on `Prize`) enforces it
server-side; the form disables visually using a `hasStamps` flag
passed from the server.

### 13.5 Does `day_cap` apply per-customer-per-merchant or per-customer-per-campaign?

The data-model file says "max entries per customer per day" without
qualifying merchant scope.

**Recommendation**: per-customer-per-campaign-per-day, regardless of
which merchant issued the stamp. A "no double-dipping in one day"
rule is the simplest mental model and matches the wireframe copy
"1 entrada por dia". The math in
`OrganizationCampaign#entries_for(customer)` already groups by
`date(created_at)` without scoping to merchant, so the data model
already encodes this — we just need to confirm and document.

### 13.6 Slug editing

`slug` is unique per organization. Editing a published slug breaks
shared URLs.

**Recommendation**: form allows it; we add a small warning ("URLs
publicadas com o slug antigo deixarão de funcionar") under the field
when the slug differs from the persisted value on edit. v1 of the
QR strategy uses merchant_id in the URL anyway (per A2.4 wireframe
note), so campaign slugs only impact public landing URLs which we
don't have yet.

### 13.7 Should `Organizations::CampaignsController` also handle `LoyaltyCampaign`?

No. Two reasons: (1) STI in Rails through a single controller is
awkward when the URL surface differs; (2) per A3 overview note,
LoyaltyCampaigns are managed per-merchant from the merchant detail
page, not from the org-level Campanhas list. The
`type: "OrganizationCampaign"` scope is explicit in `set_campaign`
and `index`.

### 13.8 Recent-activity feed on A1

**Recommendation**: ship A1 with empty-state + a TODO comment. Wire
real data in the customer-flows plan after `Visit` and `Stamp` rows
start being created. Avoids speculative API shape for a feed nobody
can populate yet.

---

## Appendix — file checklist

New files:

- `app/controllers/organizations/campaigns_controller.rb`
- `app/controllers/organizations/campaigns/activations_controller.rb`
- `app/controllers/organizations/campaigns/terminations_controller.rb`
- `app/frontend/pages/organizations/campaigns/index.tsx`
- `app/frontend/pages/organizations/campaigns/new.tsx`
- `app/frontend/pages/organizations/campaigns/edit.tsx`
- `app/frontend/pages/organizations/campaigns/show.tsx`
- `test/controllers/organizations/campaigns_controller_test.rb`
- `test/controllers/organizations/campaigns/activations_controller_test.rb`
- `test/controllers/organizations/campaigns/terminations_controller_test.rb`
- `test/models/organization_campaign_test.rb`
- `test/system/organizations/campaigns_test.rb`

Modified files:

- `config/routes.rb` — add `resources :campaigns` + member actions.
- `app/controllers/home_controller.rb` — branch on persona; render
  org-dashboard props.
- `app/controllers/organizations/merchants_controller.rb` — extend
  `show`, harden `destroy`.
- `app/models/merchant.rb` — add `loyalty_campaign`,
  `campaign_merchants`, `organization_campaigns` associations.
- `app/frontend/pages/home/index.tsx` — render dashboard cards when
  org user.
- `app/frontend/pages/organizations/merchants/show.tsx` — three new
  sections.
- `app/frontend/components/app-sidebar.tsx` — add Campanhas item.
- `app/frontend/types/index.ts` — `EntryPolicy`, `Prize`, `Campaign`,
  `CampaignSummary`.

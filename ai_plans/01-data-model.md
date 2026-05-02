# Data model

The single source of truth for tables, models, validations, indexes,
state machines, and cross-table invariants. Implementation plans (admin,
merchant, customer) build against this contract; if a flow needs a column
that isn't here, this file gets updated first.

Companion to [`./00-overview.md`](./00-overview.md).

## Conventions

- **PostgreSQL 18+**. Required for the `uuidv7()` built-in.
- **UUIDv7 primary keys.** Every table uses native `uuid` PKs with
  `default: -> { "uuidv7()" }`. Foreign keys must specify `type: :uuid`.
  Configured globally for new generators in `config/application.rb`
  (`primary_key_type: :uuid`) but the `default:` expression has to be
  added per-migration. See CLAUDE.md "UUIDv7 primary keys".
- **Slugs in URLs**, never raw IDs. UUIDs are still on the wire when an
  ID is unavoidable (admin tools), but customer-facing surfaces use
  `merchant.slug`, `campaign.slug`, etc.

## Existing tables (already in place)

These are already migrated and shipped:

- `organizations(id, name, clerk_organization_id uniq, slug nullable, image_url, slug, …)` — note: `slug` will be made `null: false` in the customer-facing-flow migration; needs backfill.
- `merchants(id, name, organization_id fk not null, slug nullable, …)` — same `slug` situation.
- `users(id, clerk_id uniq not null, email, first_name, last_name, image_url, organization_id fk, merchant_id fk)` — Clerk users; `organization_id` and `merchant_id` are mutually exclusive.

We don't migrate these from scratch; we add columns/indexes as needed.

## Entity relationship overview

```
                        ┌───────────────┐
                        │ Organization  │
                        └───────┬───────┘
                                │
                ┌───────────────┼─────────────────────────┐
                │               │                         │
                ▼               ▼                         ▼
         ┌───────────┐   ┌──────────────┐         ┌──────────────────────┐
         │ Merchant  │   │ Campaign     │ STI     │ User                 │
         └─────┬─────┘   │ ───────────  │         │ (Clerk; org or merch)│
               │         │ Organization │         └──────────────────────┘
               │         │   Campaign   │
               │         │ Loyalty      │
               │         │   Campaign   │
               │         └──────┬───────┘
               │                │
               │         ┌──────┴───────────┐
               │         │                  │
               │         ▼                  ▼
               │  ┌──────────────┐    ┌──────────────────┐
               │  │ Prize        │    │ campaign_        │
               │  │              │    │   merchants      │
               │  └──────────────┘    │  (only for Org-) │
               │                       │  Campaign)      │
               │                       └─────────┬────────┘
               │                                 │
               └─────────────────────────────────┤
                                                 │
                                                 ▼
                                          ┌────────────┐
                                          │ Customer   │
                                          └─────┬──────┘
                                                │
                                                ▼
                                          ┌────────────┐
                                          │ Visit      │
                                          └─────┬──────┘
                                                │
                              ┌─────────────────┼──────────────────┐
                              ▼                                    ▼
                     ┌─────────────────────────────┐  ┌──────────────────┐
                     │ Stamp                       │  │ Redemption       │
                     │ (per visit per campaign;    │  │ (customer ⨯      │
                     │  carries code+expires_at    │  │  campaign ⨯      │
                     │  when status='pending')     │  │  prize)          │
                     └─────────────────────────────┘  └──────────────────┘
```

## Tables to add / change

### `organizations` and `merchants` — slug becomes mandatory

```ruby
# Migration A: add slug nullable (if not yet present), backfill, then enforce.
add_column :organizations, :slug, :string  # if not present
add_column :merchants, :slug, :string      # if not present
# … backfill via Rake (see Slug helper) …
add_index :organizations, :slug, unique: true
add_index :merchants,     :slug, unique: true
change_column_null :organizations, :slug, false
change_column_null :merchants,     :slug, false
```

### `customers`

Identifies the end consumer. Not a Clerk user. WhatsApp number is the
asset; verification is async and non-blocking.

```ruby
create_table :customers, id: :uuid, default: -> { "uuidv7()" } do |t|
  t.string :phone, null: false                    # E.164 normalized; IS the WhatsApp number; uniqueness key
  t.string :name                                  # optional
  t.datetime :lgpd_opted_in_at, null: false
  t.datetime :verified_at                         # nullable; set when WhatsApp link clicked
  t.timestamps
end
add_index :customers, :phone, unique: true
```

Validations:
- `phone` presence + uniqueness; normalized via `Phonelib`. This phone IS
  the customer's WhatsApp number — verification messages target it.
- `lgpd_opted_in_at` presence.
- `verified_at` is set/unset by the verification controller; never user-editable.

### `visits`

Append-only ledger of physical scan events.

```ruby
create_table :visits, id: :uuid, default: -> { "uuidv7()" } do |t|
  t.references :customer, type: :uuid, null: false, foreign_key: true
  t.references :merchant, type: :uuid, null: false, foreign_key: true
  t.datetime :created_at, null: false
end
add_index :visits, [:merchant_id, :created_at]
add_index :visits, [:customer_id, :merchant_id]
```

### `campaigns` (STI)

Single-table inheritance with denormalized `merchant_id` for
`LoyaltyCampaign`.

```ruby
create_table :campaigns, id: :uuid, default: -> { "uuidv7()" } do |t|
  t.string :type, null: false                     # 'OrganizationCampaign' | 'LoyaltyCampaign'
  t.references :organization, type: :uuid, null: false, foreign_key: true
  t.references :merchant, type: :uuid, foreign_key: true   # NOT NULL only for LoyaltyCampaign
  t.string :name, null: false
  t.string :slug, null: false
  t.string :status, null: false, default: 'draft'  # draft | active | ended
  t.datetime :starts_at                            # OrganizationCampaign: required; LoyaltyCampaign: nullable (= activated_at)
  t.datetime :ends_at                              # OrganizationCampaign: required; LoyaltyCampaign: nullable
  t.datetime :effective_from_at                    # LoyaltyCampaign reset cutoff; balance ignores stamps before this
  t.boolean :requires_validation, null: false, default: false
  t.string :entry_policy                           # 'simple' | 'cumulative' (OrganizationCampaign only; null for LoyaltyCampaign)
  t.integer :day_cap                               # OrganizationCampaign + simple: max entries per customer per day; null = no cap
  t.timestamps
end
add_index :campaigns, [:organization_id, :slug], unique: true
add_index :campaigns, [:organization_id, :status]
add_index :campaigns, :merchant_id
```

Models:

```ruby
class Campaign < ApplicationRecord
  STATUSES = %w[draft active ended].freeze

  belongs_to :organization
  has_many :prizes, -> { order(:position) }, dependent: :destroy
  has_many :stamps,      dependent: :destroy
  has_many :redemptions, dependent: :destroy

  validates :name, :slug, :status, presence: true
  validates :slug, uniqueness: { scope: :organization_id }
  validates :status, inclusion: { in: STATUSES }

  scope :active, -> { where(status: 'active') }
  scope :ended,  -> { where(status: 'ended') }

  # No state-transition methods on the base. The OrganizationCampaign
  # lifecycle (draft → active → ended) lives in
  # OrganizationCampaign::Activatable (see 03-impl-admin.md §6.2).
  # LoyaltyCampaign uses its own #disable!(reset:) terminator below.
end

class OrganizationCampaign < Campaign
  ENTRY_POLICIES = %w[simple cumulative].freeze

  has_many :campaign_merchants, foreign_key: :campaign_id, dependent: :destroy
  has_many :merchants, through: :campaign_merchants

  validates :starts_at, :ends_at, presence: true
  validates :entry_policy, inclusion: { in: ENTRY_POLICIES }
  validate  :ends_after_starts
  validate  :merchant_id_must_be_blank
  validate  :policy_specific_config

  # Confirmed stamps as a relation, scoped to this customer.
  def confirmed_stamps_for(customer)
    stamps.confirmed.where(customer: customer)
  end

  # Distinct merchants the customer has stamped — used by cumulative entry math.
  def merchants_stamped_by(customer)
    confirmed_stamps_for(customer).distinct.pluck(:merchant_id)
  end

  # Is the customer in the raffle pool for a specific prize?
  def eligible_for?(customer, prize)
    case entry_policy
    when 'cumulative'
      merchants_stamped_by(customer).size >= prize.threshold
    when 'simple'
      confirmed_stamps_for(customer).exists?
    end
  end

  # Total entries the customer has across this campaign (for display purposes).
  # - cumulative: number of prizes the customer is currently eligible for.
  # - simple: total confirmed stamps capped per day by day_cap.
  def entries_for(customer)
    case entry_policy
    when 'cumulative'
      reached = merchants_stamped_by(customer).size
      prizes.where('threshold <= ?', reached).count
    when 'simple'
      stamps_per_day = confirmed_stamps_for(customer).group("date(created_at)").count
      stamps_per_day.values.sum { |c| day_cap ? [c, day_cap].min : c }
    end
  end

  private

  def ends_after_starts
    errors.add(:ends_at, 'must be after starts_at') if starts_at && ends_at && ends_at <= starts_at
  end

  def merchant_id_must_be_blank
    errors.add(:merchant_id, 'must be blank for OrganizationCampaign') if merchant_id.present?
  end

  def policy_specific_config
    case entry_policy
    when 'cumulative'
      errors.add(:day_cap, 'must be blank for cumulative') if day_cap.present?
    when 'simple'
      errors.add(:day_cap, 'must be a positive integer when set') if day_cap && day_cap < 1
    end
  end
end

class LoyaltyCampaign < Campaign
  belongs_to :merchant
  validates :merchant_id, presence: true

  # Balance = confirmed stamps after cutoff − redemption thresholds after cutoff.
  def balance_for(customer)
    cutoff = effective_from_at || Time.at(0)
    earned = stamps.confirmed.where(customer: customer).where('created_at > ?', cutoff).count
    spent  = redemptions.where(customer: customer).where('created_at > ?', cutoff).sum(:threshold_snapshot)
    earned - spent
  end

  def disable!(reset: false)
    transaction do
      update!(status: 'ended')
      update!(effective_from_at: Time.current) if reset
    end
  end
end
```

State machines:

```
Campaign.status:   draft ──► active ──► ended

LoyaltyCampaign on disable:
  - keep:  status: ended, effective_from_at unchanged
  - reset: status: ended, effective_from_at = now
```

Reactivation of a `LoyaltyCampaign` (re-enable after end): future
consideration; for v1, "disable" is terminal — to re-enable, create a new
LoyaltyCampaign.

### `campaign_merchants`

Only used by `OrganizationCampaign`. Empty for `LoyaltyCampaign` (the
merchant lives on `campaigns.merchant_id`).

```ruby
create_table :campaign_merchants, id: :uuid, default: -> { "uuidv7()" } do |t|
  t.references :campaign, type: :uuid, null: false, foreign_key: true
  t.references :merchant, type: :uuid, null: false, foreign_key: true
  t.datetime :created_at, null: false
end
add_index :campaign_merchants, [:campaign_id, :merchant_id], unique: true
add_index :campaign_merchants, :merchant_id
```

### `prizes`

Tier on a campaign.

```ruby
create_table :prizes, id: :uuid, default: -> { "uuidv7()" } do |t|
  t.references :campaign, type: :uuid, null: false, foreign_key: true
  t.string :name, null: false
  t.integer :threshold, null: false               # stamps/visits required
  t.integer :position, null: false, default: 0
  t.timestamps
end
add_index :prizes, [:campaign_id, :position]
```

Semantics by campaign type:
- `LoyaltyCampaign.prize.threshold` = visits required to redeem this
  prize. Required, > 0.
- `OrganizationCampaign + cumulative .prize.threshold` = stamps
  (distinct merchants) required to enter this prize's raffle pool. Each
  prize is its own raffle. Required, > 0.
- `OrganizationCampaign + simple .prize.threshold` = ignored. All prizes
  share one entry pool; one winner drawn per prize. Persist as `null`
  on create.

**Validations** (model-level, dispatched per parent type):
- `name` presence.
- LoyaltyCampaign / cumulative-OrganizationCampaign prizes:
  `threshold` presence + `> 0`.
- Simple-OrganizationCampaign prizes: `threshold` not surfaced in forms;
  null in DB.
- All campaigns require **≥1 prize** for activation. Enforced in the
  activation guard, not at the prize-row level — a draft campaign can
  exist with zero prizes; you just can't activate it.

### `stamps`

One row per `(visit, campaign)` for every campaign active at the
merchant when the visit happens. The validation code (when applicable)
lives directly on the row — there is no separate pending-check-in
table.

```ruby
create_table :stamps, id: :uuid, default: -> { "uuidv7()" } do |t|
  t.references :visit, type: :uuid, null: false, foreign_key: true
  t.references :campaign, type: :uuid, null: false, foreign_key: true
  t.references :customer, type: :uuid, null: false, foreign_key: true
  t.references :merchant, type: :uuid, null: false, foreign_key: true
  t.string :status, null: false, default: 'confirmed'   # confirmed | pending
  t.string :code, limit: 6                               # only set when status='pending'
  t.datetime :expires_at                                 # only set when status='pending'
  t.datetime :confirmed_at                               # only set when status='confirmed'
  t.datetime :created_at, null: false
end
add_index :stamps, [:visit_id, :campaign_id], unique: true
add_index :stamps, [:campaign_id, :status]
add_index :stamps, [:customer_id, :campaign_id]
add_index :stamps, [:merchant_id, :status, :code]        # validation lookup
```

`CODE_TTL = 10.minutes`.

Validations:
- `status` ∈ `{ pending, confirmed }`.
- `status == 'pending'`: `code` and `expires_at` present, `confirmed_at` null.
- `status == 'confirmed'`: `confirmed_at` present, `code` and `expires_at` null.

**Shared code per visit**: when a single scan creates multiple pending
stamps, the `ScanRegistrar` generates **one** 6-digit code and writes
it to every pending stamp from that visit. The customer sees one code;
the merchant types one code; the validator flips all matching stamps in
one transaction. There is no DB unique constraint on `(merchant_id,
code)` for this reason — siblings repeat the code by design.

Code generation collisions are avoided by checking active codes at the
merchant before assignment:

```ruby
loop do
  candidate = SecureRandom.random_number(1_000_000).to_s.rjust(6, '0')
  taken = Stamp.where(merchant_id:, status: 'pending', code: candidate)
               .where('expires_at > ?', Time.current)
               .exists?
  break candidate unless taken
end
```

State machine:

```
Stamp.status:   pending ──► confirmed
                  │            (code/expires_at cleared, confirmed_at set)
                  │
                  └── (or: never confirmed, code expires; row stays for audit)
```

### `redemptions`

A customer claimed a Prize.

```ruby
create_table :redemptions, id: :uuid, default: -> { "uuidv7()" } do |t|
  t.references :customer, type: :uuid, null: false, foreign_key: true
  t.references :campaign, type: :uuid, null: false, foreign_key: true
  t.references :prize, type: :uuid, null: false, foreign_key: true
  t.references :merchant, type: :uuid, foreign_key: true            # required for LoyaltyCampaign
  t.references :merchant_user, type: :uuid, foreign_key: { to_table: :users }   # who confirmed it
  t.integer :threshold_snapshot, null: false             # frozen prize.threshold at redemption time
  t.datetime :created_at, null: false
end
add_index :redemptions, [:customer_id, :campaign_id]
add_index :redemptions, [:merchant_id, :created_at]
```

Validations:
- `threshold_snapshot > 0`.
- For `LoyaltyCampaign`: `merchant_id` present and matches `campaign.merchant_id`; `merchant_user` belongs to that merchant.
- For `OrganizationCampaign`: redemption flow TBD (auto on completion vs in-store fulfillment).

## Cross-table invariants

These hold by design and should be enforced via validations + DB
constraints where practical.

| Invariant | Where enforced |
|---|---|
| `LoyaltyCampaign.merchant_id` present, `OrganizationCampaign.merchant_id` blank | model validations on each subclass |
| `LoyaltyCampaign` has 0 `campaign_merchants` rows | model validation |
| `OrganizationCampaign` has 1..N `campaign_merchants` rows when activated | activation guard in controller |
| `OrganizationCampaign.entry_policy ∈ { simple, cumulative }` | subclass validation |
| `LoyaltyCampaign.entry_policy` is null | subclass validation |
| `simple` may set `day_cap`; `cumulative` must not | subclass validation |
| Cumulative & loyalty Prize: `threshold` present + > 0; simple Prize: `threshold` null | per-Prize validation dispatched off campaign type |
| All campaigns have ≥1 Prize before activation; cumulative campaigns also need every Prize to have a threshold | activation guard in controller |
| `Stamp.(visit_id, campaign_id)` unique | DB unique index |
| `Stamp.merchant_id` matches `Visit.merchant_id` and equals one of the campaign's merchants | model `before_validation`; DB CHECK is impractical |
| `User.organization_id` xor `User.merchant_id` (existing rule) | already in place via model validation |
| `Campaign.slug` unique within Organization | DB unique partial index `(organization_id, slug)` |
| `Customer.phone` E.164 normalized + unique | `before_validation :normalize_phone` + DB unique index |

## Idempotency & concurrency

- **Visit creation** is intentionally non-idempotent: every scan = new
  Visit. Customers re-scanning the same merchant accumulates Visit rows.
- **Stamp insertion** is idempotent at the `(visit, campaign)` level. The
  `ScanRegistrar` uses `Stamp.insert` (PostgreSQL `ON CONFLICT DO
  NOTHING`) so concurrent registrars don't duplicate.
- **Customer creation** under contention: rescue
  `ActiveRecord::RecordNotUnique` and `find_by!(phone:)` to recover.
- **Stamp code collision avoidance**: see Stamp section. Generation loop
  inspects active pending codes at the merchant; six digits keep
  collisions astronomically rare.
- **Redemption** uses an explicit transaction that re-checks the customer's
  current balance against the prize threshold (no balance denormalization
  to drift).

## Customer verification flow (data side)

- `customers.verified_at` nullable. Set to `Time.current` when the user
  taps the link.
- The link contains a signed token: `Rails.application.message_verifier(:customer_verification).generate(customer.id, expires_in: 30.days)`.
- The token is regenerated each time the customer re-identifies with the
  same phone (idempotent — phone is the unique key).
- `WhatsAppDispatcher` is a thin interface used by the post-create
  callback in `Customer::StoreController#identify`. v1 implementation:
  enqueues a Solid Queue job that no-ops in dev (logs the link),
  hits Meta Cloud API / Z-API in production. Provider plumbing is a
  Phase D concern; the abstraction lets us defer.
- Verification does NOT gate any feature in v1.

## Reusable building blocks already in place

When implementing flows, prefer these over rewriting:

- `app/controllers/application_controller.rb` — `current_user`,
  `current_organization`, `current_merchant` helpers; `require_clerk_session!`,
  `require_organization_user!`, `require_merchant_user!`.
- `app/controllers/organizations/base_controller.rb` and
  `app/controllers/merchants/base_controller.rb` — namespace gates.
- `app/controllers/inertia_controller.rb` — `inertia_share` for
  `current_user`, `current_organization`, `current_merchant`, `title`,
  `breadcrumbs`.
- `app/controllers/concerns/page_metadata.rb` — title/breadcrumb DSL.
- `app/frontend/layouts/app-layout.tsx` — sidebar shell.
- `app/frontend/components/app-sidebar.tsx` — conditional nav.
- `app/frontend/types/index.ts` — shared-prop types.
- `app/controllers/organizations/merchants/invitations_controller.rb` —
  reference for the Clerk invitation flow (reuse for any future
  invitation surface, e.g. merchant team).
- `vite.config.ts` — `inertia-caseshift` plugin order; never write
  manual case conversions.

## Naming & style notes for implementation

- Page-rendering controllers: `< InertiaController`.
- Strong params: Rails 8 `params.expect(...)`.
- Validation errors back to forms: `redirect_to ..., inertia: { errors: ... }`.
- Service objects for multi-step writes (`ScanRegistrar`, `ValidateCheckIn`,
  `RedemptionService`) so controllers stay thin.
- Wire-format casing: snake_case (server). The Vite plugin flips it to
  camelCase on the React side.
- Test seeds belong in `db/seeds.rb` or fixtures — not in plan files.

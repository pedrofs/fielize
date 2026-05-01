# Implementation plan — Data model

This plan brings the Painel Vizinho / Fielize data model to life. It is the
**foundation** that the three persona implementation plans (admin, merchant,
customer) build on. The contract for *what* the schema must look like is
[`./01-data-model.md`](./01-data-model.md); this plan covers *how* to get
there from the current state — migrations in execution order, model
skeletons, validations, concerns, gem additions, backfill scripts, fixture
updates, and verification steps.

Companion docs:

- [`./00-overview.md`](./00-overview.md) — domain glossary and flow
  catalogue.
- [`./01-data-model.md`](./01-data-model.md) — the target schema and
  validations (the **contract** this plan executes on).
- [`../CLAUDE.md`](../CLAUDE.md) — Rails/Inertia/Vite conventions.
- [`../ai_docs/vision.md`](../ai_docs/vision.md) — product context.

## 1. Context

Today the database has only `organizations`, `merchants`, and `users`
(see `/Users/pedro/Projects/fielize/db/schema.rb`). The Clerk identity
loop is already wired. To deliver the Pasaporte de Compras pilot at CDL
Jaguarão we need the rest of the model — `customers`, `visits`,
`campaigns` (STI), `campaign_merchants`, `prizes`, `stamps`,
`redemptions` — plus mandatory slugs on the existing `organizations`
and `merchants` tables.

Once this lands, persona-specific work (admin CRUD for campaigns,
merchant validation/redemption, customer scan flow) can proceed in
parallel without each plan having to redefine the schema.

## 2. Goals

- Migrate the database to the schema in
  [`./01-data-model.md`](./01-data-model.md), with no manual steps required
  on a fresh checkout (`bin/rails db:migrate` should be sufficient *after*
  the slug backfill task is run on environments that already have data).
- Add `phonelib` and `rqrcode` gems (E.164 normalization and QR generation)
  with sensible defaults.
- Backfill `organizations.slug` and `merchants.slug` for any rows in
  pre-existing environments before flipping the columns to `NOT NULL`.
- Stand up the Active Record models (`Customer`, `Visit`, `Campaign` STI
  base + `OrganizationCampaign` + `LoyaltyCampaign`, `CampaignMerchant`,
  `Prize`, `Stamp`, `Redemption`) with all model-level validations from
  the contract — including the per-Prize threshold dispatch, the Stamp
  status invariants, and the `OrganizationCampaign` policy_specific_config
  rule.
- Wire `has_many` associations onto existing `Organization`, `Merchant`,
  and `User` models.
- Provide a `Sluggable` concern (recommendation below) so slug generation
  is consistent across `Organization`, `Merchant`, and `Campaign`.
- Provide a `Stamp::CodeGenerator` helper that the future `ScanRegistrar`
  service can call.
- Update existing fixtures so the Minitest suite still loads after the
  migrations.

## 3. Out of scope

This plan **does not** cover:

- Controllers, routes, Inertia page components, or any UI. Persona plans
  pick those up.
- The `ScanRegistrar`, `ValidateCheckIn`, `RedemptionService` service
  objects (only the `Stamp::CodeGenerator` helper they will use).
- The `WhatsAppDispatcher` real provider plumbing (Meta Cloud API /
  Z-API). The model has `customers.verified_at` and the message verifier
  setup, but the actual Solid Queue job and provider client are
  customer-flow concerns.
- The signed `customer_session` cookie / Rack middleware.
- Seed data beyond what fixtures need.
- Clerk webhook integration changes (none needed here).
- DB-level CHECK constraints for invariants the model already enforces
  (per
  [`./01-data-model.md`](./01-data-model.md) cross-table invariant
  table).

## 4. Gem additions

Add these lines to `/Users/pedro/Projects/fielize/Gemfile` near the top
of the main group (after `gem "jbuilder"` is fine):

```ruby
# E.164 phone normalization + validation. Used by Customer.
gem "phonelib"

# QR code generation as SVG/PNG. Used by merchant detail pages
# (printable QR for `/s/:merchant_slug`) and potentially admin exports.
gem "rqrcode"
```

Notes:

- **`phonelib`** is pure-Ruby and ships with libphonenumber metadata.
  No native deps. Configure default country in
  `config/initializers/phonelib.rb`:

  ```ruby
  Phonelib.default_country = "BR"
  Phonelib.strict_check    = true
  ```

  CDL Jaguarão's customers come from BR and UY. `default_country = "BR"`
  is correct because UY numbers will be entered with `+598`, while BR
  locals enter without country code. `strict_check = true` rejects
  obviously bogus numbers in `before_validation`.

- **`rqrcode`** for SVG-first rendering (Inertia page renders inline SVG;
  no asset compilation needed). Used in admin-merchant-show and
  customer-facing onboarding aids in the persona plans, but added here
  because the model layer is where slug-generation/QR concerns sit closest.

No other gems are required for this plan. (`friendly_id` is **not**
adopted — slugs are simple `parameterize` derivations and a
hand-rolled `Sluggable` concern keeps the dependency surface smaller.
Re-evaluate if/when we need history tables.)

After editing the Gemfile, run:

```bash
bundle install
```

## 5. Migrations, in execution order

All migration files live under
`/Users/pedro/Projects/fielize/db/migrate/`. Timestamps below are
illustrative (`20260501NNNNNN_*`) — use whatever `bin/rails generate
migration` produces at runtime so they sort after the existing
`20260430143632_update_users_for_organizations_and_merchants.rb`.

The slug story for `organizations` and `merchants` is split across
**three** migrations on purpose: the unique-index + NOT-NULL flip
must run *after* a backfill Rake task. A single combined migration
would couple model-loading-during-migration with the data backfill, and
break on any environment where new orgs/merchants get created between
deploy and `db:migrate`. Keep them separate.

### 5.1 `…_add_slug_index_and_constraints_to_organizations.rb` (slug enforcement, part 1)

The columns already exist (`organizations.slug`, `merchants.slug` —
both nullable). This migration **only adds the unique index** so we
can deploy code that writes slugs. NOT NULL flip happens in 5.7,
*after* the backfill task has been run.

```ruby
class AddSlugIndexAndConstraintsToOrganizations < ActiveRecord::Migration[8.2]
  def change
    add_index :organizations, :slug, unique: true, where: "slug IS NOT NULL"
    add_index :merchants,     :slug, unique: true, where: "slug IS NOT NULL"
  end
end
```

The partial index (`WHERE slug IS NOT NULL`) lets multi-row pre-backfill
states coexist without violating uniqueness, then naturally upgrades to
a full unique index once everything is backfilled. Postgres accepts
this as an equivalent constraint when no NULLs remain.

> **Gotcha** — do **not** flip `null: false` here. The fresh-clone
> developer experience (no rows yet) needs to run `db:migrate` then
> `db:seed` (or no seed at all). If we set NOT NULL on an empty table,
> nothing breaks — but on environments with pre-existing rows this
> migration would fail. We keep this migration safe-everywhere and
> defer the NOT NULL to 5.7 after the backfill Rake task.

### 5.2 `…_create_customers.rb`

```ruby
class CreateCustomers < ActiveRecord::Migration[8.2]
  def change
    create_table :customers do |t|
      t.string   :phone, null: false                  # IS the WhatsApp number
      t.string   :name
      t.string   :email
      t.datetime :lgpd_opted_in_at, null: false
      t.datetime :verified_at
      t.timestamps
    end
    add_index :customers, :phone, unique: true
  end
end
```

### 5.3 `…_create_visits.rb`

```ruby
class CreateVisits < ActiveRecord::Migration[8.2]
  def change
    create_table :visits do |t|
      t.references :customer, null: false, foreign_key: true
      t.references :merchant, null: false, foreign_key: true
      t.timestamps
    end
    add_index :visits, [:merchant_id, :created_at]
    add_index :visits, [:customer_id, :merchant_id]
  end
end
```

Note the table is append-only. We don't need `updated_at` but we'll keep it to maintain rails standards.

### 5.4 `…_create_campaigns.rb`

```ruby
class CreateCampaigns < ActiveRecord::Migration[8.2]
  def change
    create_table :campaigns do |t|
      t.string     :type, null: false
      t.references :organization, null: false, foreign_key: true
      t.references :merchant, foreign_key: true
      t.string     :name, null: false
      t.string     :slug, null: false
      t.string     :status, null: false, default: "draft"
      t.datetime   :starts_at
      t.datetime   :ends_at
      t.datetime   :effective_from_at
      t.boolean    :requires_validation, null: false, default: false
      t.string     :entry_policy
      t.integer    :day_cap
      t.timestamps
    end
    add_index :campaigns, [:organization_id, :slug], unique: true
    add_index :campaigns, [:organization_id, :status]
    # references already added an index on merchant_id
  end
end
```

> **STI gotcha** — the column name `type` is the Rails default for
> single-table inheritance. Do NOT override `Campaign.inheritance_column`.
> Subclasses (`OrganizationCampaign`, `LoyaltyCampaign`) live as their
> own `.rb` files under `app/models/` so Zeitwerk autoloads them when
> Rails boots; ActiveRecord then knows they are subclasses of `Campaign`
> and STI dispatch works. There is **no** explicit `require_dependency`
> needed.

### 5.5 `…_create_campaign_merchants.rb`

```ruby
class CreateCampaignMerchants < ActiveRecord::Migration[8.2]
  def change
    create_table :campaign_merchants do |t|
      t.references :campaign, null: false, foreign_key: true
      t.references :merchant, null: false, foreign_key: true
      t.timestamps
    end
    add_index :campaign_merchants, [:campaign_id, :merchant_id], unique: true
    # references already adds plain merchant_id index
  end
end
```

### 5.6 `…_create_prizes.rb`

```ruby
class CreatePrizes < ActiveRecord::Migration[8.2]
  def change
    create_table :prizes do |t|
      t.references :campaign, null: false, foreign_key: true
      t.string  :name, null: false
      t.integer :threshold              # null only for simple-OrganizationCampaign prizes
      t.integer :position, null: false, default: 0
      t.timestamps
    end
    add_index :prizes, [:campaign_id, :position]
  end
end
```

### 5.7 `…_create_stamps.rb`

```ruby
class CreateStamps < ActiveRecord::Migration[8.2]
  def change
    create_table :stamps do |t|
      t.references :visit,    null: false, foreign_key: true
      t.references :campaign, null: false, foreign_key: true
      t.references :customer, null: false, foreign_key: true
      t.references :merchant, null: false, foreign_key: true
      t.string   :status, null: false, default: "confirmed"
      t.string   :code, limit: 6
      t.datetime :expires_at
      t.datetime :confirmed_at
      t.datetime :created_at, null: false
    end
    add_index :stamps, [:visit_id, :campaign_id], unique: true
    add_index :stamps, [:campaign_id, :status]
    add_index :stamps, [:customer_id, :campaign_id]
    add_index :stamps, [:merchant_id, :status, :code]
  end
end
```

> **No `pending_check_ins` table.** The 6-digit `code` and `expires_at`
> live directly on the Stamp row; status flips between `pending` and
> `confirmed`. This is a deliberate departure from earlier sketches that
> referenced a side table — the contract in `01-data-model.md` is the
> source of truth.

### 5.8 `…_create_redemptions.rb`

```ruby
class CreateRedemptions < ActiveRecord::Migration[8.2]
  def change
    create_table :redemptions do |t|
      t.references :customer,      null: false, foreign_key: true
      t.references :campaign,      null: false, foreign_key: true
      t.references :prize,         null: false, foreign_key: true
      t.references :merchant,      foreign_key: true
      t.references :merchant_user, foreign_key: { to_table: :users }
      t.integer  :threshold_snapshot, null: false
      t.datetime :created_at, null: false
    end
    add_index :redemptions, [:customer_id, :campaign_id]
    add_index :redemptions, [:merchant_id, :created_at]
  end
end
```

### 5.9 (run the slug backfill Rake task at this point — see §8)

Between 5.8 and 5.10, on any environment that has pre-existing
`organizations` or `merchants` rows, run:

```bash
bin/rails db:backfill_slugs
```

On a brand-new environment (the typical dev setup), there are no rows
to backfill — the task is a no-op. On the existing dev DB it will
populate slugs from `name`.

### 5.10 `…_enforce_organization_and_merchant_slug_not_null.rb` (slug enforcement, part 2)

```ruby
class EnforceOrganizationAndMerchantSlugNotNull < ActiveRecord::Migration[8.2]
  def up
    # Defensive: if any nulls slipped through (e.g. an admin created an
    # org via Clerk webhook between deploy and backfill), fix them now.
    safety_backfill_organizations
    safety_backfill_merchants

    change_column_null :organizations, :slug, false
    change_column_null :merchants,     :slug, false

    # Promote the partial unique index from 5.1 to a full unique index.
    remove_index :organizations, name: "index_organizations_on_slug"
    remove_index :merchants,     name: "index_merchants_on_slug"
    add_index    :organizations, :slug, unique: true
    add_index    :merchants,     :slug, unique: true
  end

  def down
    change_column_null :organizations, :slug, true
    change_column_null :merchants,     :slug, true
    remove_index :organizations, name: "index_organizations_on_slug"
    remove_index :merchants,     name: "index_merchants_on_slug"
    add_index    :organizations, :slug, unique: true, where: "slug IS NOT NULL"
    add_index    :merchants,     :slug, unique: true, where: "slug IS NOT NULL"
  end

  private

  def safety_backfill_organizations
    execute(<<~SQL)
      UPDATE organizations
         SET slug = lower(regexp_replace(coalesce(name, 'org-' || id::text),
                                          '[^a-zA-Z0-9]+', '-', 'g'))
       WHERE slug IS NULL OR slug = ''
    SQL
  end

  def safety_backfill_merchants
    execute(<<~SQL)
      UPDATE merchants
         SET slug = lower(regexp_replace(coalesce(name, 'merchant-' || id::text),
                                          '[^a-zA-Z0-9]+', '-', 'g'))
       WHERE slug IS NULL OR slug = ''
    SQL
  end
end
```

> **Why the safety net?** The Rake task in §8 produces nicer slugs
> (with disambiguation suffixes for collisions). The SQL safety net
> only runs if nulls remain at migration time — typically because
> someone forgot to run the Rake task. It produces *correct* but
> potentially *uglier* slugs, and that's a fine fallback. The migration
> never silently breaks on `null: false`.

### Migration ordering recap

```
existing:
  20260429174539  create_users
  20260430143115  create_organizations
  20260430143202  create_merchants
  20260430143632  update_users_for_organizations_and_merchants

new:
  5.1  add_slug_index_and_constraints_to_organizations  (partial unique index)
  5.2  create_customers
  5.3  create_visits
  5.4  create_campaigns
  5.5  create_campaign_merchants
  5.6  create_prizes
  5.7  create_stamps
  5.8  create_redemptions
  --   bin/rails db:backfill_slugs (manual one-shot, idempotent)
  5.10 enforce_organization_and_merchant_slug_not_null
```

## 6. Models

All paths under `/Users/pedro/Projects/fielize/app/models/`. Validations
and behavior mirror the contract in
[`./01-data-model.md`](./01-data-model.md) §"Tables to add / change" —
do not introduce additional rules without updating that doc first.

### 6.1 `concerns/sluggable.rb`

**Recommendation: ship a single shared concern.** Slug derivation is
identical across `Organization`, `Merchant`, and `Campaign` (lower-case
`parameterize` of the name, with a numeric disambiguator on collision
within scope). One concern is cleaner than three near-identical
`before_validation` callbacks, and the per-model differences (uniqueness
scope) are expressed declaratively via a class macro. See §7.

```ruby
# app/models/concerns/sluggable.rb
module Sluggable
  extend ActiveSupport::Concern

  class_methods do
    # Usage:
    #   sluggable from: :name                  # global uniqueness
    #   sluggable from: :name, scope: :organization_id
    def sluggable(from:, scope: nil)
      class_attribute :slug_source_attribute, instance_writer: false
      class_attribute :slug_uniqueness_scope, instance_writer: false
      self.slug_source_attribute = from
      self.slug_uniqueness_scope = scope
      before_validation :assign_slug_if_blank
    end
  end

  private

  def assign_slug_if_blank
    return if slug.present?
    return unless self.class.slug_source_attribute
    source = public_send(self.class.slug_source_attribute)
    return if source.blank?

    base = source.to_s.parameterize
    candidate = base
    n = 2
    while slug_taken?(candidate)
      candidate = "#{base}-#{n}"
      n += 1
    end
    self.slug = candidate
  end

  def slug_taken?(candidate)
    rel = self.class.where(slug: candidate)
    if self.class.slug_uniqueness_scope
      rel = rel.where(self.class.slug_uniqueness_scope => public_send(self.class.slug_uniqueness_scope))
    end
    rel = rel.where.not(id: id) if persisted?
    rel.exists?
  end
end
```

### 6.2 `customer.rb`

```ruby
class Customer < ApplicationRecord
  has_many :visits, dependent: :restrict_with_exception
  has_many :stamps, dependent: :restrict_with_exception
  has_many :redemptions, dependent: :restrict_with_exception

  before_validation :normalize_phone

  validates :phone, presence: true, uniqueness: true
  validates :lgpd_opted_in_at, presence: true
  validate  :phone_must_be_valid_e164

  # The phone IS the WhatsApp number — verification messages target it.

  def verified?
    verified_at.present?
  end

  private

  def normalize_phone
    self.phone = Phonelib.parse(phone).e164.presence if phone.present?
  end

  def phone_must_be_valid_e164
    errors.add(:phone, "is not a valid phone number") if phone.present? && !Phonelib.valid?(phone)
  end
end
```

> The `normalize_*` callbacks intentionally run *before* the validators
> so uniqueness checks against the DB use the canonical E.164 string.
> Race-condition handling on customer creation (rescue
> `ActiveRecord::RecordNotUnique`, then `find_by!(phone:)`) lives in the
> `Customer::StoreController` — out of scope here.

### 6.3 `visit.rb`

```ruby
class Visit < ApplicationRecord
  belongs_to :customer
  belongs_to :merchant
  has_many   :stamps, dependent: :destroy
end
```

### 6.4 `campaign.rb` (STI base)

```ruby
class Campaign < ApplicationRecord
  include Sluggable
  sluggable from: :name, scope: :organization_id

  STATUSES = %w[draft active ended].freeze

  enum :status, STATUSES.index_with(&:itself)

  belongs_to :organization
  belongs_to :merchant, optional: true   # required only for LoyaltyCampaign

  has_many :prizes, -> { order(:position) }, dependent: :destroy
  has_many :stamps, dependent: :destroy
  has_many :redemptions, dependent: :destroy

  validates :name, :slug, :status, presence: true
  validates :slug, uniqueness: { scope: :organization_id }
  validates :status, inclusion: { in: STATUSES }

  def activate!
    update!(status: "active")
  end

  def end!
    update!(status: "ended")
  end
end
```

### 6.5 `organization_campaign.rb`

```ruby
class OrganizationCampaign < Campaign
  ENTRY_POLICIES = %w[simple cumulative].freeze

  enum :entry_policy, ENTRY_POLICIES.index_with(&:itself)

  has_many :campaign_merchants, foreign_key: :campaign_id, dependent: :destroy
  has_many :merchants, through: :campaign_merchants

  validates :starts_at, :ends_at, presence: true
  validate  :ends_after_starts
  validate  :merchant_id_must_be_blank
  validate  :policy_specific_config

  def confirmed_stamps_for(customer)
    stamps.confirmed.where(customer: customer)
  end

  def merchants_stamped_by(customer)
    confirmed_stamps_for(customer).distinct.pluck(:merchant_id)
  end

  def eligible_for?(customer, prize)
    if cumulative?
      merchants_stamped_by(customer).size >= prize.threshold
    elsif simple?
      confirmed_stamps_for(customer).exists?
    end
  end

  def entries_for(customer)
    if cumulative?
      reached = merchants_stamped_by(customer).size
      prizes.where("threshold <= ?", reached).count
    elsif simple?
      stamps_per_day = confirmed_stamps_for(customer).group("date(created_at)").count
      stamps_per_day.values.sum { |c| day_cap ? [c, day_cap].min : c }
    end
  end

  private

  def ends_after_starts
    return unless starts_at && ends_at
    errors.add(:ends_at, "must be after starts_at") if ends_at <= starts_at
  end

  def merchant_id_must_be_blank
    errors.add(:merchant_id, "must be blank for OrganizationCampaign") if merchant_id.present?
  end

  def policy_specific_config
    if cumulative?
      errors.add(:day_cap, "must be blank for cumulative") if day_cap.present?
    elsif simple?
      errors.add(:day_cap, "must be a positive integer when set") if day_cap && day_cap < 1
    end
  end
end
```

### 6.6 `loyalty_campaign.rb`

```ruby
class LoyaltyCampaign < Campaign
  validates :merchant_id, presence: true

  def balance_for(customer)
    cutoff = effective_from_at || Time.at(0)
    earned = stamps.confirmed.where(customer: customer).where(created_at: cutoff..).count
    spent  = redemptions.where(customer: customer).where(created_at: cutoff..).sum(:threshold_snapshot)
    earned - spent
  end

  def disable!(reset: false)
    transaction do
      update!(status: "ended")
      update!(effective_from_at: Time.current) if reset
    end
  end

  private
end
```

### 6.7 `campaign_merchant.rb`

```ruby
class CampaignMerchant < ApplicationRecord
  belongs_to :campaign
  belongs_to :merchant

  validates :campaign_id, uniqueness: { scope: :merchant_id }
  validate  :campaign_must_be_organization_campaign

  private

  def campaign_must_be_organization_campaign
    return if campaign.nil?
    errors.add(:campaign, "must be an OrganizationCampaign") unless campaign.is_a?(OrganizationCampaign)
  end
end
```

### 6.8 `prize.rb`

```ruby
class Prize < ApplicationRecord
  belongs_to :campaign
  has_many   :redemptions, dependent: :restrict_with_exception

  validates :name, presence: true
  validate  :threshold_for_campaign_type

  scope :ordered, -> { order(:position) }

  private

  def threshold_for_campaign_type
    return if campaign.nil?

    case campaign
    when LoyaltyCampaign
      errors.add(:threshold, "must be a positive integer") unless threshold.is_a?(Integer) && threshold.positive?
    when OrganizationCampaign
      if campaign.cumulative?
        errors.add(:threshold, "must be a positive integer") unless threshold.is_a?(Integer) && threshold.positive?
      elsif campaign.simple?
        errors.add(:threshold, "must be blank for simple OrganizationCampaign") if threshold.present?
      end
    end
  end
end
```

### 6.9 `stamp.rb`

```ruby
class Stamp < ApplicationRecord
  STATUSES = %w[pending confirmed].freeze

  enum :status, STATUSES.index_with(&:itself)

  belongs_to :visit
  belongs_to :campaign
  belongs_to :customer
  belongs_to :merchant

  validates :visit_id, uniqueness: { scope: :campaign_id }
  validate  :pending_invariants
  validate  :confirmed_invariants
  validate  :merchant_matches_visit

  private

  def pending_invariants
    return unless pending?
    errors.add(:code, "is required when pending") if code.blank?
    errors.add(:expires_at, "is required when pending") if expires_at.blank?
    errors.add(:confirmed_at, "must be blank when pending") if confirmed_at.present?
  end

  def confirmed_invariants
    return unless confirmed?
    errors.add(:confirmed_at, "is required when confirmed") if confirmed_at.blank?
    errors.add(:code, "must be blank when confirmed") if code.present?
    errors.add(:expires_at, "must be blank when confirmed") if expires_at.present?
  end

  def merchant_matches_visit
    return if visit.nil? || merchant_id.nil?
    errors.add(:merchant_id, "must match visit's merchant") if visit.merchant_id != merchant_id
  end
end
```

### 6.10 `stamp/code_generator.rb`

```ruby
# app/models/stamp/code_generator.rb
class Stamp
  module CodeGenerator
    CODE_TTL = 10.minutes

    module_function

    # Returns a 6-digit string that is not currently in use as a pending,
    # unexpired code at the given merchant.
    def call(merchant_id:, now: Time.current)
      loop do
        candidate = SecureRandom.random_number(1_000_000).to_s.rjust(6, "0")
        taken = Stamp.pending.where(merchant_id: merchant_id, code: candidate)
                     .where("expires_at > ?", now)
                     .exists?
        return candidate unless taken
      end
    end
  end
end
```

> **Collision avoidance is service-level**, not DB-enforced. By design,
> sibling stamps from the same visit share a code; a DB unique constraint
> on `(merchant_id, code)` would forbid that. The `ScanRegistrar` (out of
> scope here) calls `Stamp::CodeGenerator.call(merchant_id: …)` once per
> visit and writes the same code to every pending stamp it creates.

### 6.11 `redemption.rb`

```ruby
class Redemption < ApplicationRecord
  belongs_to :customer
  belongs_to :campaign
  belongs_to :prize
  belongs_to :merchant, optional: true
  belongs_to :merchant_user, class_name: "User", optional: true

  validates :threshold_snapshot, numericality: { only_integer: true, greater_than: 0 }
  validate  :loyalty_specific_rules

  private

  def loyalty_specific_rules
    return unless campaign.is_a?(LoyaltyCampaign)
    if merchant_id.blank?
      errors.add(:merchant_id, "is required for LoyaltyCampaign redemption")
    elsif merchant_id != campaign.merchant_id
      errors.add(:merchant_id, "must match campaign's merchant")
    end
    if merchant_user.present? && merchant_user.merchant_id != merchant_id
      errors.add(:merchant_user, "must belong to the redemption's merchant")
    end
  end
end
```

### 6.12 Updates to existing models

```ruby
# app/models/organization.rb
class Organization < ApplicationRecord
  include Sluggable
  sluggable from: :name

  has_many :users, dependent: :nullify
  has_many :merchants, dependent: :destroy
  has_many :campaigns, dependent: :destroy
  has_many :organization_campaigns, dependent: :destroy
  has_many :loyalty_campaigns, through: :merchants

  validates :clerk_organization_id, presence: true, uniqueness: true
  validates :slug, presence: true, uniqueness: true
end
```

```ruby
# app/models/merchant.rb
class Merchant < ApplicationRecord
  include Sluggable
  sluggable from: :name, scope: :organization_id

  belongs_to :organization
  has_many :users, dependent: :nullify
  has_many :visits, dependent: :restrict_with_exception
  has_many :stamps, dependent: :destroy
  has_many :loyalty_campaigns, dependent: :destroy
  has_many :campaign_merchants, dependent: :destroy
  has_many :organization_campaigns, through: :campaign_merchants, source: :campaign
  has_many :redemptions, dependent: :destroy

  validates :name, presence: true
  validates :slug, presence: true, uniqueness: { scope: :organization_id }
end
```

```ruby
# app/models/user.rb
class User < ApplicationRecord
  belongs_to :organization, optional: true
  belongs_to :merchant, optional: true

  has_many :redemptions, foreign_key: :merchant_user_id, dependent: :nullify

  validates :clerk_id, presence: true, uniqueness: true
  validate :scope_is_exclusive

  private

  def scope_is_exclusive
    return unless organization_id.present? && merchant_id.present?
    errors.add(:base, "user can belong to either an Organization or a Merchant, not both")
  end
end
```

> **Don't duplicate** the `users.organization_id` ↔ `users.merchant_id`
> mutual-exclusion validation — it already exists.

## 7. Concerns / shared code

**Recommendation: one shared `Sluggable` concern, three call sites.**
The slug-derivation logic is identical at `Organization`, `Merchant`,
and `Campaign`; the only thing that differs per model is the
uniqueness scope (none / `organization_id` / `organization_id`). A
class macro in the concern (`sluggable from: :name, scope:
:organization_id`) makes the per-model wiring a one-liner. Three
hand-rolled `before_validation` callbacks would cost more than the
concern in maintenance and would drift over time.

Files:

- `/Users/pedro/Projects/fielize/app/models/concerns/sluggable.rb` —
  see §6.1.
- `/Users/pedro/Projects/fielize/app/models/stamp/code_generator.rb` —
  see §6.10.

No other helper modules are needed at this layer. The persona plans will
add service objects (`ScanRegistrar`, `ValidateCheckIn`,
`RedemptionService`) under `app/services/`.

## 8. Backfill scripts

File: `/Users/pedro/Projects/fielize/lib/tasks/db.rake`.

```ruby
namespace :db do
  desc "Backfill organizations.slug and merchants.slug from name. Idempotent."
  task backfill_slugs: :environment do
    backfilled = 0

    Organization.where(slug: [nil, ""]).find_each do |org|
      candidate = derive_slug(org.name.presence || "org-#{org.id}",
                              uniqueness_scope: Organization.all)
      org.update_columns(slug: candidate, updated_at: Time.current)
      puts "  organizations[#{org.id}] => #{candidate}"
      backfilled += 1
    end

    Merchant.where(slug: [nil, ""]).find_each do |m|
      candidate = derive_slug(m.name.presence || "merchant-#{m.id}",
                              uniqueness_scope: Merchant.where(organization_id: m.organization_id))
      m.update_columns(slug: candidate, updated_at: Time.current)
      puts "  merchants[#{m.id}] => #{candidate}"
      backfilled += 1
    end

    puts "Backfilled #{backfilled} row(s)."
  end

  def derive_slug(source, uniqueness_scope:)
    base = source.to_s.parameterize
    candidate = base
    n = 2
    while uniqueness_scope.where(slug: candidate).exists?
      candidate = "#{base}-#{n}"
      n += 1
    end
    candidate
  end
end
```

Run on environments with data:

```bash
bin/rails db:backfill_slugs
```

The task is idempotent: it only touches rows where `slug` is null or
empty. Re-running it after a partial run (or after the migration has
already enforced NOT NULL) is safe — the WHERE clause will match
nothing.

Why `update_columns`: it bypasses validations and callbacks, which is
correct here because the table still allows null and the post-deploy
hook is the wrong moment to trigger model side effects. The `Sluggable`
concern won't fire either — by design.

## 9. Test fixtures

Existing fixtures live under
`/Users/pedro/Projects/fielize/test/fixtures/`. Updates required:

### 9.1 `organizations.yml` — give each org a real slug + clerk id

```yaml
one:
  name: CDL Jaguarão
  clerk_organization_id: org_test_one
  image_url: https://example.com/jaguarao.png
  slug: cdl-jaguarao

two:
  name: CDL Pelotas
  clerk_organization_id: org_test_two
  image_url: https://example.com/pelotas.png
  slug: cdl-pelotas
```

### 9.2 `merchants.yml` — add slugs scoped per organization

```yaml
one:
  name: Calzados Ricardo
  organization: one
  slug: calzados-ricardo

two:
  name: Moda Río Branco
  organization: two
  slug: moda-rio-branco
```

### 9.3 `users.yml` — fix the bogus key, drop the now-required `merchant`/`organization` linkage to one side

The current file has `organization_clerk_id` (not a column on `users`)
and uses `MyString` for `clerk_id`, which collides on uniqueness.
Replace with:

```yaml
admin:
  clerk_id: user_test_admin
  email: admin@example.com
  first_name: Pedro
  last_name: Steimbruch
  image_url: https://example.com/admin.png
  organization: one

merchant_staff:
  clerk_id: user_test_merchant
  email: ricardo@example.com
  first_name: Ricardo
  last_name: Calzados
  image_url: https://example.com/ricardo.png
  merchant: one
```

The two users sit on opposite sides of the `organization_id` ↔
`merchant_id` exclusivity — `admin` is an org user, `merchant_staff` is
a merchant user. No fixture sets both.

### 9.4 New fixture files

To keep the new tables exercisable from Minitest, add minimal fixtures:

- `/Users/pedro/Projects/fielize/test/fixtures/customers.yml`
- `/Users/pedro/Projects/fielize/test/fixtures/visits.yml`
- `/Users/pedro/Projects/fielize/test/fixtures/campaigns.yml` (STI:
  set `type:` explicitly per record)
- `/Users/pedro/Projects/fielize/test/fixtures/campaign_merchants.yml`
- `/Users/pedro/Projects/fielize/test/fixtures/prizes.yml`
- `/Users/pedro/Projects/fielize/test/fixtures/stamps.yml`
- `/Users/pedro/Projects/fielize/test/fixtures/redemptions.yml`

Each fixture file should contain at least one row exercising the happy
path (e.g. one `confirmed` stamp; one `pending` stamp with code +
expires_at; one `OrganizationCampaign` cumulative + one
`LoyaltyCampaign`). Concrete YAML left to the implementing engineer —
the model validations from §6 are the contract: fixtures that satisfy
the validations are correct fixtures.

> **STI in YAML**: for `campaigns.yml`, use the `type:` column
> explicitly:
>
> ```yaml
> pasaporte:
>   type: OrganizationCampaign
>   organization: one
>   name: Pasaporte de Compras 2026
>   slug: pasaporte-2026
>   status: active
>   starts_at: <%= 1.month.ago %>
>   ends_at:   <%= 6.months.from_now %>
>   entry_policy: cumulative
>   requires_validation: false
> ```

## 10. Verification

After running migrations and fixture updates, a fresh agent should be
able to confirm correctness with the following sequence. Commands run
from `/Users/pedro/Projects/fielize`.

### 10.1 Bundle and migrate

```bash
bundle install
bin/rails db:migrate
bin/rails db:backfill_slugs    # no-op on a fresh DB; populates on existing
bin/rails db:migrate            # runs the NOT-NULL flip migration
```

If you already ran migrations 5.1–5.8, then ran the backfill, then ran
5.10, you're done. The dev DB now matches the contract.

### 10.2 Schema sanity check

```bash
bin/rails runner '
  %w[customers visits campaigns campaign_merchants prizes stamps redemptions].each do |t|
    puts "%-20s %s" % [t, ActiveRecord::Base.connection.table_exists?(t) ? "OK" : "MISSING"]
  end
'
```

All seven should print `OK`.

### 10.3 Model load + STI sanity

```bash
bin/rails runner '
  puts Campaign.descendants.map(&:name).sort.inspect
  # => ["LoyaltyCampaign", "OrganizationCampaign"]
  puts Campaign.inheritance_column   # => "type"
'
```

### 10.4 Validation smoke tests in the console

```bash
bin/rails console
```

```ruby
org = Organization.first

# OrganizationCampaign rejects merchant_id and demands entry_policy + dates
c = OrganizationCampaign.new(organization: org, name: "X", starts_at: nil, ends_at: nil, entry_policy: nil)
c.valid?
c.errors.full_messages
# => starts_at can't be blank, ends_at can't be blank, entry_policy is not included in the list, …

# Cumulative campaign forbids day_cap
c = OrganizationCampaign.new(organization: org, name: "Y", entry_policy: "cumulative", day_cap: 1, starts_at: 1.day.ago, ends_at: 1.day.from_now)
c.valid?
c.errors[:day_cap]
# => ["must be blank for cumulative"]

# Stamp pending invariants
s = Stamp.new(status: "pending", code: nil, expires_at: nil)
s.valid?
s.errors[:code]        # => ["is required when pending"]
s.errors[:expires_at]  # => ["is required when pending"]

# Customer phone normalization
cust = Customer.new(phone: "(53) 99999-1111", lgpd_opted_in_at: Time.current)
cust.valid?
cust.phone           # => "+5553999991111" (or similar canonical E.164)
```

### 10.5 Run the test suite

```bash
bin/rails test
```

Existing model tests for `Organization`, `Merchant`, `User` should
still pass. The new fixtures must load cleanly — fixture-loading
failures show up as `ActiveRecord::FixtureSet::FormatError` or
validation-style messages.

Add (at minimum) these new model tests under `test/models/`:

- `customer_test.rb` — phone normalization, uniqueness, LGPD presence.
- `campaign_test.rb` + `organization_campaign_test.rb` +
  `loyalty_campaign_test.rb` — STI dispatch, validation rules
  (especially `policy_specific_config`, `merchant_id_must_be_blank`,
  and `entry_policy_must_be_blank`).
- `prize_test.rb` — threshold dispatch off campaign type.
- `stamp_test.rb` — pending/confirmed invariants, visit-merchant match,
  `(visit_id, campaign_id)` uniqueness.
- `redemption_test.rb` — `threshold_snapshot > 0`,
  `loyalty_specific_rules`.
- `sluggable_test.rb` (optional but cheap) — `Organization` and
  `Merchant` derive slugs from name; collisions get `-2` suffix.

### 10.6 Lint + security

```bash
bin/rubocop
bin/brakeman
```

Both must be clean.

## 11. Open questions

1. **`Sluggable` collision strategy: numeric suffix vs. random suffix?**
   Recommendation: stick with numeric (`-2`, `-3`, …). Predictable and
   human-readable. Random suffixes make admin URLs ugly. If we later
   need to mutate slugs we'll add a slug-history table — out of scope.

2. **Should `Visit.created_at` be the ledger order key, or do we
   need a separate `occurred_at`?** Recommendation: `created_at` is
   sufficient for v1 — there is no offline ingest path (no reason for
   the timestamps to diverge). Revisit when offline-first comes up.

3. **Should `Stamp` have a denormalized `organization_id`?** It would
   simplify org-scoped activity feeds (admin dashboard A1) by avoiding
   a join. Recommendation: **don't** add yet. The `merchant_id` join is
   one hop and Postgres handles it fine at v1 scale. Reconsider if the
   admin dashboard query becomes a hot spot.

4. **Foreign-key indexes on `t.references` are added by default in
   Rails 8 — do we need to opt out anywhere?** Recommendation: no.
   Every FK in this plan benefits from the implicit index.

5. **Soft-delete on `Merchant` (per A2.5 in `00-overview.md`, "soft or
   hard — TBD")?** Recommendation: defer to the admin impl plan
   (`02-impl-admin.md`). The data-model surface change would be
   `t.datetime :deleted_at` + `default_scope`; trivial to add later
   without a backfill.

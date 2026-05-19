# frozen_string_literal: true

class OrganizationCampaign < Campaign
  include Activatable

  ENTRY_POLICIES = %w[simple cumulative].freeze

  enum :entry_policy, ENTRY_POLICIES.index_with(&:itself)

  has_many :campaign_merchants, foreign_key: :campaign_id, inverse_of: :organization_campaign, dependent: :destroy
  has_many :merchants, through: :campaign_merchants

  accepts_nested_attributes_for :prizes, allow_destroy: true

  before_validation :null_out_thresholds_for_simple_policy
  validates :entry_policy, inclusion: { in: ENTRY_POLICIES }
  validates :starts_at, :ends_at, presence: true
  validate  :ends_after_starts
  validate  :merchant_id_must_be_blank
  validate  :policy_specific_config
  validate  :prevent_merchant_removal_when_locked

  def confirmed_stamps_for(customer)
    stamps.where(status: "confirmed", customer: customer)
  end

  def merchants_stamp_summary
    campaign_merchants
      .joins(:merchant)
      .joins(<<~SQL)
        LEFT OUTER JOIN stamps
          ON stamps.merchant_id = campaign_merchants.merchant_id
         AND stamps.campaign_id = campaign_merchants.campaign_id
         AND stamps.status = 'confirmed'
      SQL
      .group("campaign_merchants.merchant_id", "merchants.name", "campaign_merchants.created_at")
      .order("merchants.name ASC")
      .pluck(
        "campaign_merchants.merchant_id",
        "merchants.name",
        Arel.sql("COUNT(stamps.id)"),
        Arel.sql("COUNT(DISTINCT stamps.customer_id)"),
        "campaign_merchants.created_at"
      )
      .map do |merchant_id, name, stamps_count, distinct_customers_count, joined_at|
        {
          merchant_id: merchant_id,
          name: name,
          stamps_count: stamps_count,
          distinct_customers_count: distinct_customers_count,
          joined_at: joined_at
        }
      end
  end

  def merchants_stamped_by(customer)
    confirmed_stamps_for(customer).distinct.pluck(:merchant_id)
  end

  # Paginated enrollment rows for the Clientes tab. Each row carries the
  # Customer (id + display name + masked phone), the enrollment's
  # consented_at, the confirmed Stamps count for this Campaign, and a
  # policy-aware progress payload:
  #
  #   cumulative → { kind: "cumulative", merchants_stamped: N, next_prize_threshold: T|nil }
  #   simple     → { kind: "simple",     entries: N }
  #
  # Sorted by confirmed Stamps DESC then consented_at DESC. Aggregations
  # are computed in SQL (single query for the page) to avoid N+1.
  def enrollment_rows(page:, per_page: 25)
    confirmed_join = <<~SQL.squish
      LEFT OUTER JOIN stamps
        ON stamps.customer_id = enrollments.customer_id
       AND stamps.campaign_id = enrollments.campaign_id
       AND stamps.status      = 'confirmed'
    SQL

    base_scope = enrollments
                   .joins(:customer)
                   .joins(confirmed_join)
                   .group("enrollments.id", "customers.id")
                   .select(
                     "enrollments.id AS enrollment_id",
                     "enrollments.customer_id AS enrollment_customer_id",
                     "enrollments.consented_at AS enrollment_consented_at",
                     "customers.name AS customer_name",
                     "customers.phone AS customer_phone",
                     Arel.sql("COUNT(stamps.id) AS confirmed_stamps_count"),
                     Arel.sql("COUNT(DISTINCT stamps.merchant_id) AS distinct_merchants_stamped")
                   )
                   .order(Arel.sql("COUNT(stamps.id) DESC"), Arel.sql("enrollments.consented_at DESC"))

    pagy = Pagy.new(count: enrollments.count, page: page.to_i, limit: per_page)
    page_records = base_scope.offset(pagy.offset).limit(pagy.limit).to_a

    rows = page_records.map { |record| build_enrollment_row(record) }

    [ pagy, rows ]
  end

  def merchants_not_yet_in_campaign
    organization.merchants
                .where.not(id: campaign_merchants.select(:merchant_id))
                .order(:name)
  end

  # Attach every Organization Merchant that is not yet in this Campaign, in a
  # single transaction. Idempotent: re-running attaches nothing if every
  # Merchant is already in the join table. Returns the Merchants that were
  # newly attached.
  def attach_all_missing_merchants!
    transaction do
      merchants_not_yet_in_campaign.to_a.each do |merchant|
        campaign_merchants.find_or_create_by!(merchant: merchant)
      end
    end
  end

  def eligible_for?(customer, prize)
    if cumulative?
      merchants_stamped_by(customer).size >= prize.threshold
    elsif simple?
      confirmed_stamps_for(customer).exists?
    end
  end

  # Show-page "Sorteio" panel payload. Nil on `draft` (pool size is
  # meaningless before the campaign runs); otherwise carries the raffle
  # state and per-Prize pool sizes. Slice 1 only exposes the "open"
  # state (active or ended pre-draw); later slices grow this to surface
  # winners and delivery state.
  def raffle_panel
    return nil unless active? || ended?
    pool_sizes = raffle_pool_sizes
    {
      state: "open",
      prizes: prizes.order(:position).map do |prize|
        {
          id: prize.id,
          name: prize.name,
          threshold: prize.threshold,
          pool_size: pool_sizes[prize.id] || 0
        }
      end
    }
  end

  # Raffle pool size per Prize, returned as `{prize_id => count}`.
  #
  # - `cumulative`: per-prize count of unique Customers whose confirmed
  #   distinct-merchant tally crossed that Prize's threshold.
  # - `simple`: total entries across all Customers (capped by `day_cap`
  #   per day, treated as unbounded when nil); every Prize shares the
  #   same pool since simple entries aren't tier-specific.
  #
  # Returns `{}` for `draft` campaigns — the pool only exists once the
  # campaign is running.
  def raffle_pool_sizes
    return {} unless active? || ended?

    if cumulative?
      distinct_merchants_per_customer =
        stamps.where(status: "confirmed").distinct.group(:customer_id).count(:merchant_id)
      prizes.order(:position).each_with_object({}) do |prize, sizes|
        sizes[prize.id] = distinct_merchants_per_customer.values.count { |n| n >= prize.threshold.to_i }
      end
    else
      stamps_per_customer_day =
        stamps.where(status: "confirmed").group(:customer_id, Arel.sql("DATE(created_at)")).count
      total = stamps_per_customer_day.values.sum { |c| day_cap ? [ c, day_cap ].min : c }
      prizes.order(:position).each_with_object({}) { |prize, sizes| sizes[prize.id] = total }
    end
  end

  def entries_for(customer)
    if cumulative?
      reached = merchants_stamped_by(customer).size
      prizes.where("threshold <= ?", reached).count
    elsif simple?
      stamps_per_day = confirmed_stamps_for(customer).group("date(created_at)").count
      stamps_per_day.values.sum { |c| day_cap ? [ c, day_cap ].min : c }
    end
  end

  private

  def build_enrollment_row(record)
    stamps_count = record.confirmed_stamps_count.to_i
    customer = {
      id: record.enrollment_customer_id,
      display_name: record.customer_name,
      phone_masked: mask_phone(record.customer_phone)
    }

    {
      customer: customer,
      consented_at: record.enrollment_consented_at,
      stamps_count: stamps_count,
      progress: build_progress_for(
        merchants_stamped: record.distinct_merchants_stamped.to_i,
        customer_id: record.enrollment_customer_id
      )
    }
  end

  def build_progress_for(merchants_stamped:, customer_id:)
    if cumulative?
      next_threshold = prizes
                         .where("threshold > ?", merchants_stamped)
                         .order(:threshold)
                         .limit(1)
                         .pluck(:threshold)
                         .first
      { kind: "cumulative", merchants_stamped: merchants_stamped, next_prize_threshold: next_threshold }
    else
      { kind: "simple", entries: simple_entries_count(customer_id) }
    end
  end

  def simple_entries_count(customer_id)
    per_day = stamps.where(status: "confirmed", customer_id: customer_id)
                    .group("DATE(created_at)")
                    .count
    per_day.values.sum { |c| day_cap ? [ c, day_cap ].min : c }
  end

  def mask_phone(phone)
    return nil if phone.blank?
    parsed = Phonelib.parse(phone)
    return phone unless parsed.valid?
    "+#{parsed.country_code} ** *****-#{parsed.e164[-4..]}"
  end

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

  # Defense in depth: simple-policy campaigns must not carry thresholds,
  # even if a stale form posts one.
  def null_out_thresholds_for_simple_policy
    return unless simple?
    prizes.each { |p| p.threshold = nil unless p.marked_for_destruction? }
  end

  # Adds always allowed; removes only while draft. Once locked (active or
  # ended), dropping a merchant aborts the save — historical participation
  # cannot be retroactively erased once a Campaign has ended.
  def prevent_merchant_removal_when_locked
    return unless persisted? && (active? || ended?)
    persisted_join_ids = campaign_merchants.where.not(id: nil).pluck(:merchant_id)
    surviving_ids = campaign_merchants.reject(&:marked_for_destruction?).map(&:merchant_id)
    removed = persisted_join_ids - surviving_ids
    return if removed.empty?
    errors.add(:base, "Não é possível remover lojistas de uma campanha ativa ou encerrada.")
  end
end

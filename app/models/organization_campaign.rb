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
  validate  :prevent_merchant_removal_when_active

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

  # Adds always allowed; removes only while draft. Once active, dropping
  # a merchant aborts the save.
  def prevent_merchant_removal_when_active
    return unless persisted? && active?
    persisted_join_ids = campaign_merchants.where.not(id: nil).pluck(:merchant_id)
    surviving_ids = campaign_merchants.reject(&:marked_for_destruction?).map(&:merchant_id)
    removed = persisted_join_ids - surviving_ids
    return if removed.empty?
    errors.add(:base, "Não é possível remover lojistas de uma campanha ativa.")
  end
end

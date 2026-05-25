class Merchant < ApplicationRecord
  include Sluggable
  sluggable from: :name

  include Geocoding

  belongs_to :organization
  has_many :visits, dependent: :restrict_with_exception
  has_many :stamps, dependent: :destroy
  has_one  :loyalty_campaign, dependent: :destroy
  has_many :campaign_merchants, dependent: :destroy
  has_many :organization_campaigns, through: :campaign_merchants
  has_many :redemptions, dependent: :destroy
  has_many :memberships, class_name: "OrganizationMembership", dependent: :nullify
  has_many :users, through: :memberships

  validates :name, presence: true
  validates :latitude, :longitude, presence: true

  # Loyalty + OrganizationCampaigns currently within their active window
  # that cover this Merchant. Shared by Customer::MerchantsController#show
  # (page-state branching) and Visit::Scannable (Stamp creation).
  def active_campaigns_now(at: Time.current)
    org = organization_campaigns.active_now(at: at).to_a
    loyalty = loyalty_campaign && loyalty_campaign.status == "active" ? [ loyalty_campaign ] : []
    org + loyalty
  end

  def confirm_stamps(code:)
    Stamp.transaction do
      pending = stamps.pending
                      .where(code: code)
                      .where("expires_at > ?", Time.current)
                      .lock("FOR UPDATE")
                      .to_a
      return [] if pending.empty?

      Stamp.where(id: pending.map(&:id)).update_all(
        status: "confirmed", confirmed_at: Time.current,
        code: nil, expires_at: nil
      )
      Stamp.where(id: pending.map(&:id)).to_a
    end
  end

  def campaign_progress_for(customer:, visit:)
    visit.stamps.includes(:campaign).map(&:campaign).uniq
         .select { |c| c.status == "active" }
         .filter_map { |c| progress_line_for(c, customer) }
  end

  # Progress lines for the customer-facing landing (page-states 4/5), computed
  # straight from the matching active campaigns — no Visit needed — so the
  # customer sees how close they are *before* claiming. Each line carries a
  # `count` and the next `goal` threshold (nil once every prize is reachable),
  # letting the page frame "X de Y · faltam N" and a "comece agora" zero-state.
  def landing_progress_for(customer:, campaigns:)
    campaigns.select { |c| c.status == "active" }
             .filter_map { |c| landing_progress_line_for(c, customer) }
  end

  private

  def landing_progress_line_for(campaign, customer)
    case campaign
    when LoyaltyCampaign
      balance = campaign.balance_for(customer)
      { kind: "loyalty", id: campaign.id, name: campaign.name,
        count: balance, goal: campaign.next_threshold_above(balance) }
    when OrganizationCampaign
      if campaign.cumulative?
        reached = campaign.merchants_stamped_by(customer).size
        { kind: "organization", entry_policy: "cumulative",
          id: campaign.id, name: campaign.name,
          count: reached, goal: campaign.next_threshold_above(reached) }
      else
        { kind: "organization", entry_policy: "simple",
          id: campaign.id, name: campaign.name,
          count: campaign.entries_for(customer), goal: nil }
      end
    end
  end

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

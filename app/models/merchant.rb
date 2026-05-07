class Merchant < ApplicationRecord
  include Sluggable
  sluggable from: :name

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

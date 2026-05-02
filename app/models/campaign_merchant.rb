# frozen_string_literal: true

class CampaignMerchant < ApplicationRecord
  belongs_to :organization_campaign, foreign_key: :campaign_id, inverse_of: :campaign_merchants
  belongs_to :merchant

  validates :merchant_id, uniqueness: { scope: :campaign_id }
  before_destroy :prevent_removal_when_campaign_active

  private

  # Once a campaign is active, merchants can be added but not removed.
  # The "end the campaign first" rule applies regardless of removal path
  # (merchant_ids=, association destroy, etc.).
  def prevent_removal_when_campaign_active
    return unless organization_campaign.active?
    errors.add(:base, "Não é possível remover lojistas de uma campanha ativa.")
    throw :abort
  end
end

# frozen_string_literal: true

class CampaignMerchant < ApplicationRecord
  belongs_to :organization_campaign, foreign_key: :campaign_id, inverse_of: :campaign_merchants
  belongs_to :merchant

  validates :merchant_id, uniqueness: { scope: :campaign_id }
  before_destroy :prevent_removal_when_campaign_locked

  private

  # Once a campaign is locked (active or ended), merchants can be added
  # but not removed. The "end the campaign first" rule applies to active
  # campaigns; ended campaigns are frozen entirely so historical
  # participation cannot be retroactively erased.
  def prevent_removal_when_campaign_locked
    return unless organization_campaign.active? || organization_campaign.ended?
    errors.add(:base, "Não é possível remover lojistas de uma campanha ativa ou encerrada.")
    throw :abort
  end
end

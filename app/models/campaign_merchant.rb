# frozen_string_literal: true

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

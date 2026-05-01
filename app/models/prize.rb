# frozen_string_literal: true

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

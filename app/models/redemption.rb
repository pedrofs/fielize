# frozen_string_literal: true

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

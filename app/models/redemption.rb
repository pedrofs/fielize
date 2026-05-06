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
      errors.add(:merchant_id, "é obrigatório para resgate de Cartão Fidelidade")
    elsif merchant_id != campaign.merchant_id
      errors.add(:merchant_id, "deve corresponder ao lojista da campanha")
    end
    if merchant_user.present?
      unless merchant_user.organization_memberships.exists?(merchant_id:)
        errors.add(:merchant_user, "deve pertencer ao lojista do resgate")
      end
    end
  end
end

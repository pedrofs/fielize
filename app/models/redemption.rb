class Redemption < ApplicationRecord
  belongs_to :customer
  belongs_to :campaign
  belongs_to :prize
  belongs_to :merchant, optional: true
  belongs_to :redeemed_by_user, class_name: "User", optional: true
  belongs_to :raffle, optional: true

  validates :threshold_snapshot,
    numericality: { only_integer: true, greater_than: 0 },
    if: :loyalty_campaign?
  validate :loyalty_specific_rules,     if: :loyalty_campaign?
  validate :organization_specific_rules, if: :organization_campaign?

  private

  def loyalty_campaign?
    campaign.is_a?(LoyaltyCampaign)
  end

  def organization_campaign?
    campaign.is_a?(OrganizationCampaign)
  end

  def loyalty_specific_rules
    if raffle_id.present?
      errors.add(:raffle_id, "deve estar em branco para resgate de Cartão Fidelidade")
    end
    if merchant_id.blank?
      errors.add(:merchant_id, "é obrigatório para resgate de Cartão Fidelidade")
    elsif merchant_id != campaign.merchant_id
      errors.add(:merchant_id, "deve corresponder ao lojista da campanha")
    end
    if redeemed_by_user.present?
      unless redeemed_by_user.organization_memberships.exists?(merchant_id:)
        errors.add(:redeemed_by_user, "deve pertencer ao lojista do resgate")
      end
    end
  end

  def organization_specific_rules
    if raffle_id.blank?
      errors.add(:raffle_id, "é obrigatório para resgate de sorteio")
    else
      if raffle.winner_customer_id != customer_id
        errors.add(:customer_id, "deve corresponder ao vencedor do sorteio")
      end
      if raffle.prize_id != prize_id
        errors.add(:prize_id, "deve corresponder ao prêmio do sorteio")
      end
    end
    if merchant_id.present?
      errors.add(:merchant_id, "deve estar em branco para resgate de sorteio")
    end
    if threshold_snapshot.present?
      errors.add(:threshold_snapshot, "deve estar em branco para resgate de sorteio")
    end
  end
end

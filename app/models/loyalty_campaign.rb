# frozen_string_literal: true

class LoyaltyCampaign < Campaign
  validates :merchant_id, presence: true
  validate  :entry_policy_must_be_blank
  validate  :must_have_at_least_one_prize, on: :activation

  def activate!
    raise ActiveRecord::RecordInvalid.new(self) unless valid?(:activation)
    update!(status: "active")
  end

  def balance_for(customer)
    cutoff = effective_from_at || Time.at(0)
    earned = stamps.where(status: "confirmed", customer: customer).where("created_at > ?", cutoff).count
    spent  = redemptions.where(customer: customer).where("created_at > ?", cutoff).sum(:threshold_snapshot)
    earned - spent
  end

  def disable!(reset: false)
    transaction do
      update!(status: "ended")
      update!(effective_from_at: Time.current) if reset
    end
  end

  # Re-checks balance under transaction so a stale preview can't issue
  # an over-balance redemption. Raises ActiveRecord::RecordInvalid on
  # failure; controller rescues for the friendly-error path.
  def redeem!(customer:, prize:, by:)
    transaction do
      unless prize.campaign_id == id
        errors.add(:base, "Prêmio inválido para esta campanha.")
        raise ActiveRecord::RecordInvalid.new(self)
      end

      balance = balance_for(customer)
      if balance < prize.threshold
        errors.add(:base, "Saldo insuficiente (#{balance} de #{prize.threshold}).")
        raise ActiveRecord::RecordInvalid.new(self)
      end

      redemptions.create!(
        customer: customer, prize: prize, merchant: merchant,
        merchant_user: by, threshold_snapshot: prize.threshold
      )
    end
  end

  private

  def entry_policy_must_be_blank
    errors.add(:entry_policy, "must be blank for LoyaltyCampaign") if entry_policy.present?
  end

  def must_have_at_least_one_prize
    errors.add(:base, "Adicione ao menos um prêmio antes de ativar.") unless prizes.exists?
  end
end

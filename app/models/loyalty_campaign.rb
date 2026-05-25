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

  # Builds the customer's Card: a punchcard driven by the spend-down
  # `balance_for` against the prize tiers. An inactive campaign is `disabled`
  # regardless of balance; otherwise reaching the cheapest prize makes it
  # `redeemable`, and progress always exposes the tiers (so a redeemable card
  # can still show the next, higher unreached tier).
  def card_for(customer:)
    balance = balance_for(customer)
    Card.new(
      campaign: self,
      customer: customer,
      state: card_state(balance),
      progress: card_progress(balance)
    )
  end

  # The Card a brand-new Customer would see — balance 0, every tier unreached —
  # built straight from the Prizes with no Customer. The merchant's draft page
  # renders it as a live "como seu cliente vê o cartão" preview, so its shape
  # mirrors `card_for` and reuses the same CardBody. Unlike `card_for` it stays
  # `collecting` regardless of status (a draft isn't `active`, so `card_state`
  # would otherwise read `disabled`).
  def preview_card
    Card.new(
      campaign: self,
      customer: nil,
      state: "collecting",
      progress: card_progress(0)
    )
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
        redeemed_by_user: by, threshold_snapshot: prize.threshold
      )
    end
  end

  private

  def card_state(balance)
    return "disabled" unless active?

    minimum = prizes.minimum(:threshold)
    minimum && balance >= minimum ? "redeemable" : "collecting"
  end

  def card_progress(balance)
    tiers = prizes.reorder(:threshold).map do |prize|
      { name: prize.name, threshold: prize.threshold, reached: balance >= prize.threshold }
    end

    {
      kind: "loyalty",
      balance: balance,
      next_threshold: tiers.find { |tier| !tier[:reached] }&.fetch(:threshold),
      tiers: tiers
    }
  end

  def entry_policy_must_be_blank
    errors.add(:entry_policy, "must be blank for LoyaltyCampaign") if entry_policy.present?
  end

  def must_have_at_least_one_prize
    errors.add(:base, "Adicione ao menos um prêmio antes de ativar.") unless prizes.exists?
  end
end

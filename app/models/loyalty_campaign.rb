# frozen_string_literal: true

class LoyaltyCampaign < Campaign
  validates :merchant_id, presence: true
  validate  :entry_policy_must_be_blank

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

  private

  def entry_policy_must_be_blank
    errors.add(:entry_policy, "must be blank for LoyaltyCampaign") if entry_policy.present?
  end
end

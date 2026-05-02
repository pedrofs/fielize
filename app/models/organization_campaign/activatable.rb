# frozen_string_literal: true

# Lifecycle for OrganizationCampaign: the activation guards, the
# activate! orchestrator, and the matching end! transition.
#
# Per CLAUDE.md "single-model concerns", lives under the model's
# namespace at app/models/organization_campaign/activatable.rb. If a
# second model later needs activation, promote to Campaign::Activatable
# at that point — not before.
module OrganizationCampaign::Activatable
  extend ActiveSupport::Concern

  included do
    validate :prizes_present_for_activation,            on: :activation
    validate :all_prizes_have_threshold_for_activation, on: :activation
    validate :merchants_present_for_activation,         on: :activation
  end

  # Flip draft → active. Returns false (and populates errors) on guard
  # failure. Activating a non-draft campaign is a no-op that returns
  # false.
  def activate!
    return false unless draft?
    return false unless valid?(:activation)
    update!(status: "active")
  end

  # Flip active → ended. Returns false on draft or already-ended.
  def end!
    return false unless active?
    update!(status: "ended")
  end

  private

  def prizes_present_for_activation
    errors.add(:prizes, "É necessário ao menos um prêmio.") if prizes.empty?
  end

  def all_prizes_have_threshold_for_activation
    return unless entry_policy == "cumulative"
    return if prizes.all? { |p| p.threshold.to_i.positive? }
    errors.add(:prizes, "Todos os prêmios precisam de marco (>0) em campanhas acumulativas.")
  end

  def merchants_present_for_activation
    errors.add(:merchants, "É necessário ao menos um lojista.") if merchants.empty?
  end
end

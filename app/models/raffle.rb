# frozen_string_literal: true

# One Raffle per Prize on an OrganizationCampaign. Records the drawn
# winner (or no_winner when the eligible pool was empty), the seed
# used so the draw is replayable, and the timestamp of the draw.
# Materialised by OrganizationCampaign#draw!.
class Raffle < ApplicationRecord
  STATUSES = %w[drawn no_winner].freeze

  belongs_to :prize
  belongs_to :campaign
  belongs_to :winner_customer, class_name: "Customer", optional: true

  has_many :raffle_entries, dependent: :destroy

  validates :status, inclusion: { in: STATUSES }
  validates :seed,   presence: true
  validates :drawn_at, presence: true
  validates :prize_id, uniqueness: true

  validate :winner_consistency_with_status

  def drawn?;     status == "drawn";     end
  def no_winner?; status == "no_winner"; end

  private

  def winner_consistency_with_status
    if drawn? && winner_customer_id.blank?
      errors.add(:winner_customer_id, "is required when status is drawn")
    elsif no_winner? && winner_customer_id.present?
      errors.add(:winner_customer_id, "must be blank when status is no_winner")
    end
  end
end

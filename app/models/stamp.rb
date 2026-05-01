# frozen_string_literal: true

class Stamp < ApplicationRecord
  STATUSES = %w[pending confirmed].freeze

  belongs_to :visit
  belongs_to :campaign
  belongs_to :customer
  belongs_to :merchant

  validates :status, inclusion: { in: STATUSES }
  validates :visit_id, uniqueness: { scope: :campaign_id }
  validate  :pending_invariants
  validate  :confirmed_invariants
  validate  :merchant_matches_visit

  scope :pending,   -> { where(status: "pending") }
  scope :confirmed, -> { where(status: "confirmed") }

  def pending?;   status == "pending";   end
  def confirmed?; status == "confirmed"; end

  private

  def pending_invariants
    return unless pending?
    errors.add(:code, "is required when pending") if code.blank?
    errors.add(:expires_at, "is required when pending") if expires_at.blank?
    errors.add(:confirmed_at, "must be blank when pending") if confirmed_at.present?
  end

  def confirmed_invariants
    return unless confirmed?
    errors.add(:confirmed_at, "is required when confirmed") if confirmed_at.blank?
    errors.add(:code, "must be blank when confirmed") if code.present?
    errors.add(:expires_at, "must be blank when confirmed") if expires_at.present?
  end

  def merchant_matches_visit
    return if visit.nil? || merchant_id.nil?
    errors.add(:merchant_id, "must match visit's merchant") if visit.merchant_id != merchant_id
  end
end

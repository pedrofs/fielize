# frozen_string_literal: true

class Customer < ApplicationRecord
  has_many :visits, dependent: :restrict_with_exception
  has_many :stamps, dependent: :restrict_with_exception
  has_many :redemptions, dependent: :restrict_with_exception

  before_validation :normalize_phone

  validates :phone, presence: true, uniqueness: true
  validates :lgpd_opted_in_at, presence: true
  validate  :phone_must_be_valid_e164

  # The phone IS the WhatsApp number — verification messages target it.

  def verified?
    verified_at.present?
  end

  def self.normalize_phone(raw)
    return nil if raw.blank?
    digits = raw.to_s.gsub(/\D/, "")
    return nil if digits.empty?
    parsed = Phonelib.parse(digits)
    parsed.valid? ? parsed.e164 : nil
  end

  private

  def normalize_phone
    self.phone = self.class.normalize_phone(phone) if phone.present?
  end

  def phone_must_be_valid_e164
    errors.add(:phone, "is not a valid phone number") if phone.present? && !Phonelib.valid?(phone)
  end
end

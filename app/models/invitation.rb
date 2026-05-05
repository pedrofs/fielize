class Invitation < ApplicationRecord
  belongs_to :organization
  belongs_to :invited_by, class_name: "User"
  belongs_to :merchant, optional: true

  has_secure_token :token

  enum :role, { owner: "owner", member: "member" }

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :email, uniqueness: { scope: :organization_id, case_sensitive: false }, if: -> { accepted_at.nil? }
  validate :expiration_not_passed, if: :expires_at

  normalizes :email, with: ->(e) { e.strip.downcase }

  before_create :set_expires_at

  def pending?
    accepted_at.nil? && !expired?
  end

  def expired?
    expires_at.present? && Time.current > expires_at
  end

  def accept(user)
    return false if user.email.downcase != email.downcase

    transaction do
      organization.memberships.create!(
        user:,
        role:,
        merchant:,
        invited_by:
      )
      update!(accepted_at: Time.current)
    end
  end

  private

  def set_expires_at
    self.expires_at = 7.days.from_now
  end

  def expiration_not_passed
    errors.add(:base, "o convite expirou") if expired?
  end
end

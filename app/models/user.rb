class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy
  has_many :organization_memberships, dependent: :destroy
  has_many :organizations, through: :organization_memberships
  has_many :invitations_sent, class_name: "Invitation", foreign_key: :invited_by_id, dependent: :nullify
  has_many :redemptions, foreign_key: :merchant_user_id, dependent: :nullify

  validates :email, presence: true, uniqueness: { case_sensitive: false }

  normalizes :email, with: ->(e) { e.strip.downcase }

  def membership_for(organization)
    organization_memberships.find_by(organization:)
  end

  def merchant_scope
    membership = organization_memberships.find { |m| m.merchant_id.present? }
    membership&.merchant
  end

  def owns_organization?(organization)
    organization_memberships.find_by(organization:, role: :owner).present?
  end

  def member_of?(organization)
    organization_memberships.find_by(organization:).present?
  end

  def owns_any_organization?
    organization_memberships.where(role: :owner).exists?
  end

  def active_organization
    return @active_organization if defined?(@active_organization)
    @active_organization = organizations.first
  end

  def active_organization=(org)
    @active_organization = member_of?(org) ? org : nil
  end
end

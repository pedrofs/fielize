class OrganizationMembership < ApplicationRecord
  belongs_to :organization
  belongs_to :user
  belongs_to :merchant, optional: true
  belongs_to :invited_by, class_name: "User", optional: true

  enum :role, { owner: "owner", member: "member" }

  validates :user_id, uniqueness: { scope: :organization_id }
  validate :at_least_one_owner

  private

  def at_least_one_owner
    return unless role_changed? && role_was == "owner"
    return if organization.memberships.where.not(id:).where(role: :owner).exists?

    errors.add(:role, "deve ter pelo menos um proprietário")
  end
end

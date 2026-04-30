class User < ApplicationRecord
  belongs_to :organization, optional: true
  belongs_to :merchant, optional: true

  validates :clerk_id, presence: true, uniqueness: true
  validate :scope_is_exclusive

  private

  def scope_is_exclusive
    return unless organization_id.present? && merchant_id.present?

    errors.add(:base, "user can belong to either an Organization or a Merchant, not both")
  end
end

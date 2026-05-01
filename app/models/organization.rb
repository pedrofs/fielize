class Organization < ApplicationRecord
  include Sluggable
  sluggable from: :name

  has_many :users, dependent: :nullify
  has_many :merchants, dependent: :destroy
  has_many :campaigns, dependent: :destroy
  has_many :organization_campaigns, dependent: :destroy
  has_many :loyalty_campaigns, through: :merchants

  validates :clerk_organization_id, presence: true, uniqueness: true
end

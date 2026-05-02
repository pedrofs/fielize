class Merchant < ApplicationRecord
  include Sluggable
  sluggable from: :name

  belongs_to :organization
  has_many :users, dependent: :nullify
  has_many :visits, dependent: :restrict_with_exception
  has_many :stamps, dependent: :destroy
  has_many :loyalty_campaigns, dependent: :destroy
  has_many :campaign_merchants, dependent: :destroy
  has_many :organization_campaigns, through: :campaign_merchants, source: :campaign
  has_many :redemptions, dependent: :destroy

  validates :name, presence: true
end

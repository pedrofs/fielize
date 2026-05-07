class Organization < ApplicationRecord
  include Sluggable
  sluggable from: :name

  has_many :memberships, class_name: "OrganizationMembership", dependent: :destroy
  has_many :users, through: :memberships
  has_many :merchants, dependent: :destroy
  has_many :campaigns, dependent: :destroy
  has_many :organization_campaigns, dependent: :destroy
  has_many :loyalty_campaigns, through: :merchants, source: :loyalty_campaign
  has_many :invitations, dependent: :destroy
end

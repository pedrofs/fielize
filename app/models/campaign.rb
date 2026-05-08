# frozen_string_literal: true

class Campaign < ApplicationRecord
  include Sluggable
  sluggable from: :name, scope: :organization_id

  STATUSES = %w[draft active ended].freeze

  belongs_to :organization
  belongs_to :merchant, optional: true   # required only for LoyaltyCampaign

  has_many :prizes, -> { order(:position) }, dependent: :destroy
  has_many :stamps, dependent: :destroy
  has_many :redemptions, dependent: :destroy

  has_rich_text :description
  has_rich_text :terms
  has_one_attached :hero_image

  validates :name, :slug, :status, presence: true
  validates :slug, uniqueness: { scope: :organization_id }
  validates :status, inclusion: { in: STATUSES }

  scope :draft,  -> { where(status: "draft") }
  scope :active, -> { where(status: "active") }
  scope :ended,  -> { where(status: "ended") }

  # Customer-facing "running right now" filter: status is active AND the
  # campaign is within its time window (LoyaltyCampaigns omit start/end —
  # NULLs treated as open-ended).
  scope :active_now, ->(at: Time.current) {
    active.where("(starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at > ?)", at, at)
  }

  def draft?;    status == "draft";    end
  def active?;   status == "active";   end
  def ended?;    status == "ended";    end

  # No `activate!` / `end!` on the base. The OrganizationCampaign lifecycle
  # (draft → active → ended) lives in OrganizationCampaign::Activatable.
  # LoyaltyCampaign uses its own #disable!(reset:) terminator.
end

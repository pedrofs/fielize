# frozen_string_literal: true

class Campaign < ApplicationRecord
  include Sluggable
  sluggable from: :name, scope: :organization_id

  STATUSES = %w[draft active ended drawn].freeze

  belongs_to :organization
  belongs_to :merchant, optional: true   # required only for LoyaltyCampaign

  has_many :prizes, -> { order(:position) }, dependent: :destroy
  has_many :stamps, dependent: :destroy
  has_many :redemptions, dependent: :destroy
  has_many :enrollments, dependent: :destroy
  has_many :enrolled_customers, through: :enrollments, source: :customer

  has_rich_text :description
  has_rich_text :terms
  has_one_attached :hero_image

  validates :name, :slug, :status, presence: true
  validates :slug, uniqueness: { scope: :organization_id }
  validates :status, inclusion: { in: STATUSES }

  scope :draft,  -> { where(status: "draft") }
  scope :active, -> { where(status: "active") }
  scope :ended,  -> { where(status: "ended") }
  scope :drawn,  -> { where(status: "drawn") }

  # Customer-facing "running right now" filter: status is active AND the
  # campaign is within its time window (LoyaltyCampaigns omit start/end —
  # NULLs treated as open-ended).
  scope :active_now, ->(at: Time.current) {
    active.where("(starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at > ?)", at, at)
  }

  def draft?;    status == "draft";    end
  def active?;   status == "active";   end
  def ended?;    status == "ended";    end
  def drawn?;    status == "drawn";    end

  # Idempotent on (customer, campaign): repeat calls return the existing
  # row without creating a duplicate or re-firing the WhatsApp job.
  # Lives on the base so OrganizationCampaign and LoyaltyCampaign share
  # the implementation — Enrollment doesn't care about the STI subtype.
  def enroll!(customer:)
    enrollment = enrollments.find_or_create_by!(customer: customer) do |e|
      e.consented_at = Time.current
    end

    if enrollment.previously_new_record? && !customer.verified?
      WhatsAppDeliveryJob.perform_later(customer_id: customer.id)
    end

    enrollment
  end

  # No `activate!` / `end!` on the base. The OrganizationCampaign lifecycle
  # (draft → active → ended) lives in OrganizationCampaign::Activatable.
  # LoyaltyCampaign uses its own #disable!(reset:) terminator.
end

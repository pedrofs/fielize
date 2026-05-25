# frozen_string_literal: true

class Merchants::LoyaltyProgramsController < Merchants::BaseController
  # How close (in Stamps) a Customer must be to the cheapest Prize to surface in
  # the "Quase lá" list. Fixed for v1 (PRD #51, Slice 3).
  NEAR_WITHIN = 2

  before_action :set_loyalty

  with_breadcrumb label: "Cartão Fidelidade",
                  path: -> { merchants_loyalty_program_path }

  def show
    set_title "Cartão Fidelidade"

    props = {
      loyalty_program: serialize(@loyalty),
      prizes: @loyalty.prizes.ordered.map { |p| serialize_prize(p) }
    }
    # Lifecycle branch: draft renders the live preview Card; active renders the
    # two current-state standings lists (later slices add metrics on top).
    props[:preview_card] = serialize_card(@loyalty.preview_card) if @loyalty.draft?
    props[:standings] = serialize_standings(@loyalty) if @loyalty.active?

    render inertia: props
  end

  def update
    case params[:action_kind]
    when "enable"
      @loyalty.activate!
      redirect_to merchants_loyalty_program_path, notice: "Programa ativado."
    when "disable"
      reset = ActiveModel::Type::Boolean.new.cast(params[:reset])
      @loyalty.disable!(reset: reset)
      redirect_to merchants_loyalty_program_path, notice: "Programa desativado."
    else
      head :bad_request
    end
  rescue ActiveRecord::RecordInvalid => e
    redirect_to merchants_loyalty_program_path,
                inertia: { errors: e.record.errors }
  end

  private

  def set_loyalty
    @loyalty = current_merchant.loyalty_campaign || create_draft
  end

  def create_draft
    org = current_merchant.organization
    LoyaltyCampaign.create!(
      organization: org, merchant: current_merchant,
      name: "Cartão Fidelidade",
      slug: "cartao-fidelidade-#{current_merchant.slug}",
      status: "draft"
    )
  end

  def serialize(loyalty)
    {
      id: loyalty.id,
      name: loyalty.name,
      status: loyalty.status,
      effective_from_at: loyalty.effective_from_at
    }
  end

  # A CardPresentation (state + organization + progress) — the same shape
  # `Customer::CardsController` serializes, so the frontend reuses CardBody.
  def serialize_card(card)
    organization = card.organization
    {
      state: card.state,
      organization: {
        name: organization.name,
        image_url: organization.image_url
      },
      progress: card.progress
    }
  end

  # The active dashboard's two actionable lists plus the cheapest threshold the
  # frontend needs to render "balance/threshold". Read-only by design (ADR-0006).
  def serialize_standings(loyalty)
    {
      cheapest_threshold: loyalty.prizes.minimum(:threshold),
      redeemable: loyalty.redeemable.map { |row| serialize_standing(row) },
      near_reward: loyalty.near_reward(within: NEAR_WITHIN).map { |row| serialize_standing(row) }
    }
  end

  def serialize_standing(row)
    {
      customer_id: row.customer.id,
      customer_name: row.customer.name.presence || row.customer.phone_masked,
      balance: row.balance,
      missing: row.missing
    }
  end

  def serialize_prize(prize)
    {
      id: prize.id,
      name: prize.name,
      threshold: prize.threshold,
      position: prize.position
    }
  end
end

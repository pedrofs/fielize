# frozen_string_literal: true

class Merchants::LoyaltyProgramsController < Merchants::BaseController
  before_action :set_loyalty

  with_breadcrumb label: "Cartão Fidelidade",
                  path: -> { merchants_loyalty_program_path }

  def show
    set_title "Cartão Fidelidade"

    render inertia: {
      loyalty_program: serialize(@loyalty),
      prizes: @loyalty.prizes.ordered.map { |p| serialize_prize(p) }
    }
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

  def serialize_prize(prize)
    {
      id: prize.id,
      name: prize.name,
      threshold: prize.threshold,
      position: prize.position
    }
  end
end

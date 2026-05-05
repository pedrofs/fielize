# frozen_string_literal: true

class Organizations::MerchantsController < Organizations::BaseController
  before_action :set_merchant, only: %i[show edit update destroy]

  with_breadcrumb label: "Lojistas", path: -> { organizations_merchants_path }

  def index
    set_title "Lojistas"

    render inertia: {
      merchants: current_organization.merchants.order(:name).map { |m| serialize(m) }
    }
  end

  def show
    set_title @merchant.name
    add_breadcrumb label: @merchant.name, path: organizations_merchant_path(@merchant)

    loyalty = @merchant.loyalty_campaign
    participating = @merchant.organization_campaigns
                             .where(status: %w[active ended])
                             .order(starts_at: :desc)

    render inertia: {
      merchant: serialize(@merchant),
      members: @merchant.users.order(:email).map { |u| serialize_user(u) },
      loyalty_campaign: loyalty && serialize_loyalty(loyalty),
      participating_campaigns: participating.map { |c| serialize_participating(c) }
    }
  end

  def new
    set_title "Novo lojista"
    add_breadcrumb label: "Novo", path: new_organizations_merchant_path

    render inertia: { merchant: { name: "" } }
  end

  def create
    merchant = current_organization.merchants.build(merchant_params)

    if merchant.save
      redirect_to organizations_merchants_path, notice: "Lojista criado."
    else
      redirect_to new_organizations_merchant_path, inertia: { errors: merchant.errors }
    end
  end

  def edit
    set_title @merchant.name
    add_breadcrumb label: @merchant.name, path: edit_organizations_merchant_path(@merchant)

    render inertia: { merchant: serialize(@merchant) }
  end

  def update
    if @merchant.update(merchant_params)
      redirect_to organizations_merchants_path, notice: "Lojista atualizado."
    else
      redirect_to edit_organizations_merchant_path(@merchant), inertia: { errors: @merchant.errors }
    end
  end

  def destroy
    @merchant.destroy
    redirect_to organizations_merchants_path, notice: "Lojista excluído."
  end

  private

  def set_merchant
    @merchant = current_organization.merchants.find(params[:id])
  end

  def merchant_params
    params.expect(merchant: [ :name ])
  end

  def serialize(merchant)
    {
      id: merchant.id,
      name: merchant.name,
      organization_id: merchant.organization_id,
      created_at: merchant.created_at
    }
  end

  def serialize_user(user)
    {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      image_url: user.image_url
    }
  end

  def serialize_loyalty(campaign)
    {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      prize_count: campaign.prizes.count,
      active_customer_count: campaign.stamps.confirmed.distinct.count(:customer_id)
      # manage_url comes from the merchant-side surface; stitched in on
      # the React side once the merchant routes ship.
    }
  end

  def serialize_participating(campaign)
    {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      status: campaign.status,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at
    }
  end
end

# frozen_string_literal: true

class Organizations::MerchantsController < Organizations::BaseController
  before_action :set_merchant, only: %i[show edit update destroy]

  with_breadcrumb label: "Merchants", path: -> { organizations_merchants_path }

  def index
    set_title "Merchants"

    render inertia: {
      merchants: current_organization.merchants.order(:name).map { |m| serialize(m) }
    }
  end

  def show
    set_title @merchant.name
    add_breadcrumb label: @merchant.name, path: organizations_merchant_path(@merchant)

    render inertia: {
      merchant: serialize(@merchant),
      members: @merchant.users.order(:email).map { |u| serialize_user(u) }
    }
  end

  def new
    set_title "New merchant"
    add_breadcrumb label: "New", path: new_organizations_merchant_path

    render inertia: { merchant: { name: "" } }
  end

  def create
    merchant = current_organization.merchants.build(merchant_params)

    if merchant.save
      redirect_to organizations_merchants_path, notice: "Merchant created."
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
      redirect_to organizations_merchants_path, notice: "Merchant updated."
    else
      redirect_to edit_organizations_merchant_path(@merchant), inertia: { errors: @merchant.errors }
    end
  end

  def destroy
    @merchant.destroy
    redirect_to organizations_merchants_path, notice: "Merchant deleted."
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
end

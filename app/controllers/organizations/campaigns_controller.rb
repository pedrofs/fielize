# frozen_string_literal: true

class Organizations::CampaignsController < Organizations::BaseController
  before_action :set_campaign, only: %i[show edit update destroy]

  with_breadcrumb label: "Campanhas", path: -> { organizations_campaigns_path }

  def index
    set_title "Campanhas"

    scope = current_organization.campaigns.where(type: "OrganizationCampaign")
    scope = scope.where(status: params[:status]) if params[:status].present?

    render inertia: {
      campaigns: scope.order(created_at: :desc).map { |c| serialize_summary(c) },
      filter: params[:status]
    }
  end

  def show
    set_title @campaign.name
    add_breadcrumb label: @campaign.name, path: organizations_campaign_path(@campaign)

    render inertia: {
      campaign: serialize_campaign_chrome(@campaign),
      merchants_count: @campaign.merchants.count,
      enrollments_count: @campaign.enrollments.count,
      merchant_rows: serialize_merchant_rows(@campaign),
      available_merchants: @campaign.merchants_not_yet_in_campaign.map { |m| { id: m.id, name: m.name } }
    }
  end

  def new
    set_title "Nova campanha"
    add_breadcrumb label: "Nova", path: new_organizations_campaign_path

    render inertia: {
      campaign: blank_campaign_payload
    }
  end

  def create
    campaign = current_organization.organization_campaigns.new(campaign_params)

    if campaign.save
      redirect_to organizations_campaign_path(campaign), notice: "Campanha criada."
    else
      redirect_to new_organizations_campaign_path, inertia: { errors: campaign.errors }
    end
  end

  def edit
    set_title @campaign.name
    add_breadcrumb label: @campaign.name, path: organizations_campaign_path(@campaign)
    add_breadcrumb label: "Editar", path: edit_organizations_campaign_path(@campaign)

    render inertia: {
      campaign: serialize_full(@campaign)
    }
  end

  def update
    if @campaign.update(campaign_params)
      redirect_to organizations_campaign_path(@campaign), notice: "Campanha atualizada."
    else
      redirect_to edit_organizations_campaign_path(@campaign), inertia: { errors: @campaign.errors }
    end
  end

  def destroy
    unless @campaign.draft?
      return redirect_to organizations_campaigns_path,
        alert: "Apenas campanhas em rascunho podem ser excluídas."
    end
    @campaign.destroy
    redirect_to organizations_campaigns_path, notice: "Campanha excluída."
  end

  private

  def set_campaign
    @campaign = current_organization.campaigns
                                    .where(type: "OrganizationCampaign")
                                    .find(params[:id])
  end

  def campaign_params
    params.expect(campaign: [
      :name, :slug, :starts_at, :ends_at, :requires_validation,
      :entry_policy, :day_cap,
      :description, :terms, :hero_image,
      prizes_attributes: [ [ :id, :name, :threshold, :position, :_destroy ] ]
    ])
  end

  def blank_campaign_payload
    {
      id: nil,
      name: "",
      slug: "",
      status: "draft",
      starts_at: nil,
      ends_at: nil,
      entry_policy: "cumulative",
      requires_validation: false,
      day_cap: nil,
      prizes: [],
      description: nil,
      terms: nil,
      hero_image_url: nil
    }
  end

  def serialize_summary(campaign)
    {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      status: campaign.status,
      entry_policy: campaign.entry_policy,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      merchants_count: campaign.merchants.count,
      prizes_count: campaign.prizes.count
    }
  end

  def serialize_merchant_rows(campaign)
    campaign.merchants_stamp_summary.map do |row|
      {
        merchant_id: row[:merchant_id],
        name: row[:name],
        stamps_count: row[:stamps_count],
        distinct_customers_count: row[:distinct_customers_count],
        joined_at: row[:joined_at]
      }
    end
  end

  def serialize_campaign_chrome(campaign)
    {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      status: campaign.status,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      entry_policy: campaign.entry_policy,
      day_cap: campaign.day_cap,
      prizes: campaign.prizes.order(:position).map do |p|
        { id: p.id, name: p.name, threshold: p.threshold, position: p.position }
      end
    }
  end

  def serialize_full(campaign)
    {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      status: campaign.status,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      entry_policy: campaign.entry_policy,
      requires_validation: campaign.requires_validation,
      day_cap: campaign.day_cap,
      prizes: campaign.prizes.order(:position).map do |p|
        { id: p.id, name: p.name, threshold: p.threshold, position: p.position }
      end,
      description: campaign.description.body&.to_html,
      terms: campaign.terms.body&.to_html,
      hero_image_url: campaign.hero_image.attached? ? rails_blob_path(campaign.hero_image, only_path: true) : nil
    }
  end
end

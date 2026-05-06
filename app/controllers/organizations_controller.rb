class OrganizationsController < InertiaController
  before_action :require_authentication
  before_action :set_organization, only: %i[edit update]

  def new
    @organization = Organization.new
    render inertia: "organizations/new"
  end

  def create
    @organization = Organization.new(organization_params)

    if @organization.save
      @organization.memberships.create!(user: current_user, role: :owner)
      redirect_to root_path, notice: "Organization created."
    else
      redirect_to new_organization_path, inertia: { errors: @organization.errors.messages.transform_keys { |k| "organization.#{k}" } }
    end
  end

  def edit
    render inertia: "organizations/edit", props: {
      organization: @organization.slice(:id, :name, :slug)
    }
  end

  def update
    if @organization.update(organization_params)
      redirect_to organizations_path, notice: "Organization updated."
    else
      redirect_to edit_organization_path(@organization), inertia: { errors: @organization.errors.messages.transform_keys { |k| "organization.#{k}" } }
    end
  end

  private

  def set_organization
    @organization = current_user.organizations.find(params[:id])
  end

  def organization_params
    params.require(:organization).permit(:name, :slug)
  end
end

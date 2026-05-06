class Organizations::MembershipsController < Organizations::BaseController
  before_action :set_membership, only: %i[update destroy]

  def index
    @memberships = current_organization.memberships.includes(:user, :merchant)
    render inertia: "organizations/memberships/index", props: {
      memberships: @memberships.map do |m|
        {
          id: m.id,
          user: {
            id: m.user.id,
            email: m.user.email,
            first_name: m.user.first_name,
            last_name: m.user.last_name
          },
          role: m.role,
          merchant: m.merchant&.slice(:id, :name)
        }
      end
    }
  end

  def update
    if @membership.update(membership_params)
      redirect_to organization_memberships_path(current_organization), notice: "Membro atualizado."
    else
      redirect_to organization_memberships_path(current_organization), inertia: { errors: @membership.errors.messages.transform_keys { |k| "membership.#{k}" } }
    end
  end

  def destroy
    @membership.destroy
    redirect_to organization_memberships_path(current_organization), notice: "Membro removido."
  end

  private

  def set_membership
    @membership = current_organization.memberships.find(params[:id])
  end

  def membership_params
    params.require(:membership).permit(:role)
  end
end

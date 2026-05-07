class Organizations::SwitchingController < Organizations::BaseController
  def create
    organization = current_user.organizations.find(params[:id])
    session[:current_organization_id] = organization.id
    redirect_to root_path
  end
end

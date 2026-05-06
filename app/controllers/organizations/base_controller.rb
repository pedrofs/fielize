class Organizations::BaseController < InertiaController
  before_action :require_authentication
  before_action :require_organization_user!
end

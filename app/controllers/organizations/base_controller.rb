# frozen_string_literal: true

class Organizations::BaseController < InertiaController
  before_action :require_clerk_session!
  before_action :require_organization_user!
end

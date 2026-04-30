# frozen_string_literal: true

class Merchants::BaseController < InertiaController
  before_action :require_clerk_session!
  before_action :require_merchant_user!
end

class Merchants::BaseController < InertiaController
  before_action :require_authentication
  before_action :require_merchant_user!
end

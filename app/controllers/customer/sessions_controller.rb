# frozen_string_literal: true

# "Forget me on this device" — clears the signed `customer_session`
# cookie. The Customer record itself is left intact (the user can
# re-attach by re-entering their phone on any enrollment form, or by
# tapping a fresh WhatsApp verification link).
class Customer::SessionsController < Customer::BaseController
  skip_before_action :set_organization

  def destroy
    Customer.forget_cookie(cookie_jar: cookies)
    redirect_to customer_profile_path
  end
end

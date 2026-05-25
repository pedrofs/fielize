# frozen_string_literal: true

# Customer account screen at `/me/perfil` — the "Perfil" tab. Surfaces the
# visitor's identity (display name + masked phone), WhatsApp verification
# status with a resend affordance, a privacy/LGPD link, and the
# "esquecer este dispositivo" action.
#
# The display name is editable (#update writes `Customer#name` only); the
# phone is immutable — it is the identity key, stable across Organizations.
#
# Visitors with no signed cookie see a friendly placeholder. There is no
# auth gate — the page renders for anyone, the cookie just decides the state.
class Customer::ProfileController < Customer::BaseController
  skip_before_action :set_organization

  def show
    set_title "Perfil"

    render inertia: "customer/profile/show", props: {
      profile: serialize_profile(@current_customer)
    }
  end

  def update
    return redirect_to customer_profile_path unless @current_customer

    if @current_customer.update(profile_params)
      redirect_to customer_profile_path, notice: "Perfil atualizado."
    else
      redirect_to customer_profile_path, inertia: { errors: @current_customer.errors }
    end
  end

  private

  def serialize_profile(customer)
    return { recognized: false } unless customer

    {
      recognized: true,
      name: customer.display_name,
      phone_masked: customer.phone_masked,
      verified: customer.verified?
    }
  end

  def profile_params
    params.fetch(:profile, {}).permit(:name)
  end
end

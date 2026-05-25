# frozen_string_literal: true

# Wallet restore — "entrar com WhatsApp". Posted from the empty/unrecognized
# Wallet placeholder at `/me`. Hands the phone to `Customer.recover_wallet`,
# which sends the device link only if it matches a Customer, then redirects
# back to the Wallet with an acknowledgement.
#
# The response is identical whether or not the phone matched a Customer, so
# Wallet membership can't be enumerated by probing numbers.
class Customer::WalletRecoveriesController < Customer::BaseController
  skip_before_action :set_organization

  def create
    Customer.recover_wallet(phone: wallet_recovery_params[:phone])

    redirect_to customer_wallet_path,
      notice: "Se houver uma conta com esse número, enviamos um link pelo WhatsApp para recuperar seus cartões."
  end

  private

  def wallet_recovery_params
    params.fetch(:wallet_recovery, {}).permit(:phone)
  end
end

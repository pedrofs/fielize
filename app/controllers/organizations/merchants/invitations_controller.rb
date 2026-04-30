# frozen_string_literal: true

class Organizations::Merchants::InvitationsController < Organizations::BaseController
  before_action :set_merchant

  def create
    email = params.dig(:invitation, :email).to_s.strip

    if email.blank?
      return redirect_to organizations_merchant_path(@merchant),
        inertia: { errors: { "invitation.email" => "Email can't be blank" } }
    end

    request = Clerk::Models::Operations::CreateInvitationRequest.new(
      email_address: email,
      public_metadata: { merchant_id: @merchant.id }
    )

    begin
      Clerk::SDK.new.invitations.create(request: request)
      redirect_to organizations_merchant_path(@merchant), notice: "Invitation sent to #{email}."
    rescue => e
      Rails.logger.error("Clerk invitation failed: #{e.class} #{e.message}")
      redirect_to organizations_merchant_path(@merchant),
        inertia: { errors: { "invitation.email" => "Could not send invitation" } }
    end
  end

  private

  def set_merchant
    @merchant = current_organization.merchants.find(params[:merchant_id])
  end
end

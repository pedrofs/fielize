class Organizations::Merchants::InvitationsController < Organizations::BaseController
  before_action :set_merchant

  def create
    email = params.dig(:invitation, :email).to_s.strip

    if email.blank?
      return redirect_to organizations_merchant_path(@merchant),
        inertia: { errors: { "invitation.email" => "Email não pode ficar em branco" } }
    end

    invitation = @merchant.organization.invitations.new(
      email:,
      role: :member,
      merchant: @merchant,
      invited_by: current_user
    )

    if invitation.save
      InvitationMailer.with(invitation:).invite.deliver_later
      redirect_to organizations_merchant_path(@merchant), notice: "Convite enviado para #{email}."
    else
      redirect_to organizations_merchant_path(@merchant),
        inertia: { errors: { "invitation.email" => invitation.errors.full_messages.to_sentence } }
    end
  end

  private

  def set_merchant
    @merchant = current_organization.merchants.find(params[:merchant_id])
  end
end

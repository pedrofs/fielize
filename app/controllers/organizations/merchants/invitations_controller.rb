class Organizations::Merchants::InvitationsController < Organizations::BaseController
  before_action :set_merchant
  before_action :check_email_present, only: :create

  def create
    email = params.dig(:invitation, :email).to_s.strip

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

  def check_email_present
    email = params.dig(:invitation, :email).to_s.strip
    return unless email.blank?

    redirect_to organizations_merchant_path(@merchant),
      inertia: { errors: { "invitation.email" => "Email não pode ficar em branco" } }
  end
end

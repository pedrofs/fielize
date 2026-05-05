class InvitationAcceptancesController < ApplicationController
  allow_unauthenticated_access only: %i[show create]

  def show
    @invitation = Invitation.find_by(token: params[:token])

    unless @invitation&.pending?
      redirect_to new_session_path, alert: "O convite é inválido ou expirou."
      return
    end

    if authenticated? && current_user.email.downcase == @invitation.email.downcase
      @invitation.accept(current_user)
      redirect_to root_path, notice: "Você entrou em #{@invitation.organization.name}."
    else
      session[:invitation_token] = params[:token]
      redirect_to new_registration_path, notice: "Crie uma conta para aceitar o convite."
    end
  end

  def create
    return redirect_to new_registration_path unless authenticated?

    token = session.delete(:invitation_token)
    invitation = Invitation.find_by(token:)

    if invitation&.pending? && invitation.email.downcase == current_user.email.downcase
      invitation.accept(current_user)
      redirect_to root_path, notice: "Você entrou em #{invitation.organization.name}."
    else
      redirect_to root_path
    end
  end
end

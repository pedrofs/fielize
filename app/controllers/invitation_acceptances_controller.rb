class InvitationAcceptancesController < ApplicationController
  allow_unauthenticated_access only: %i[show create]

  before_action :set_invitation, only: %i[show create]
  before_action :require_valid_invitation, only: %i[show create]
  before_action :require_authenticated_and_matching_email, only: :create

  def show
    if authenticated? && current_user.email.downcase == @invitation.email.downcase
      @invitation.accept(current_user)
      redirect_to root_path, notice: "Você entrou em #{@invitation.organization.name}."
    else
      session[:invitation_token] = params[:token]
      redirect_to new_registration_path, notice: "Crie uma conta para aceitar o convite."
    end
  end

  def create
    @invitation.accept(current_user)
    redirect_to root_path, notice: "Você entrou em #{@invitation.organization.name}."
  end

  private

  def set_invitation
    @invitation = Invitation.find_by(token: params[:token])
  end

  def require_valid_invitation
    return if @invitation&.pending?

    redirect_to new_session_path, alert: "O convite é inválido ou expirou."
  end

  def require_authenticated_and_matching_email
    return if authenticated? && current_user.email.downcase == @invitation.email.downcase

    redirect_to new_registration_path
  end
end

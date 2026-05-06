class RegistrationsController < ApplicationController
  allow_unauthenticated_access only: %i[new create]

  def new
    render inertia: "registrations/new"
  end

  def create
    @user = User.new(user_params)

    if @user.save
      invitation_token = session.delete(:invitation_token)
      invitation = invitation_token && Invitation.find_by(token: invitation_token)

      if invitation&.pending? && invitation.email.downcase == @user.email.downcase
        invitation.accept(@user)
      else
        org = Organization.create!(name: "#{@user.first_name || "Minha"} Organização")
        org.memberships.create!(user: @user, role: :owner)
      end

      start_new_session_for(@user)
      redirect_to after_authentication_url
    else
      redirect_to new_registration_path, inertia: { errors: @user.errors.messages.transform_keys { |k| "user.#{k}" } }
    end
  end

  private

  def user_params
    params.permit(:email, :password, :password_confirmation, :first_name, :last_name)
  end
end

class RegistrationsController < ApplicationController
  allow_unauthenticated_access only: %i[new create]

  def new
    render inertia: "auth/sign_up"
  end

  def create
    @user = User.new(user_params)

    if @user.save
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

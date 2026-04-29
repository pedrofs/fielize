class ApplicationController < ActionController::Base
  include Clerk::Authenticatable

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  helper_method :current_user

  private

  def require_clerk_session!
    redirect_to "/sign-in" unless clerk.session
  end

  def current_user
    return @current_user if defined?(@current_user)
    return @current_user = nil unless clerk.user_id

    cu = clerk.user
    primary_email = cu.email_addresses.find { |e| e.id == cu.primary_email_address_id }&.email_address

    user = User.find_or_initialize_by(clerk_id: clerk.user_id)
    user.assign_attributes(
      email: primary_email,
      first_name: cu.first_name,
      last_name: cu.last_name,
      image_url: cu.image_url,
      organization_clerk_id: clerk.organization_id
    )
    user.save! if user.changed?
    @current_user = user
  rescue ActiveRecord::RecordNotUnique
    @current_user = User.find_by!(clerk_id: clerk.user_id)
  end
end

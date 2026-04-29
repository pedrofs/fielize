class ApplicationController < ActionController::Base
  include Clerk::Authenticatable

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  private

  def require_clerk_session!
    redirect_to "/sign-in" unless clerk.session
  end
end

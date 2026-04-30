class ApplicationController < ActionController::Base
  include Clerk::Authenticatable

  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  helper_method :current_user, :current_organization, :current_merchant

  private

  def require_clerk_session!
    redirect_to "/sign-in" unless clerk.session
  end

  def require_organization_user!
    redirect_to root_path unless current_user&.organization_id.present?
  end

  def require_merchant_user!
    redirect_to root_path unless current_user&.merchant_id.present?
  end

  def current_user
    return @current_user if defined?(@current_user)
    return @current_user = nil unless clerk.user_id

    cu = clerk.user
    primary_email = cu.email_addresses.find { |e| e.id == cu.primary_email_address_id }&.email_address
    metadata_merchant_id = cu.public_metadata&.dig(:merchant_id) || cu.public_metadata&.dig("merchant_id")

    user = User.find_or_initialize_by(clerk_id: clerk.user_id)
    user.assign_attributes(
      email: primary_email,
      first_name: cu.first_name,
      last_name: cu.last_name,
      image_url: cu.image_url,
      organization_id: current_organization&.id,
      merchant_id: metadata_merchant_id || user.merchant_id
    )
    user.save! if user.changed?
    @current_user = user
  rescue ActiveRecord::RecordNotUnique
    @current_user = User.find_by!(clerk_id: clerk.user_id)
  end

  def current_organization
    return @current_organization if defined?(@current_organization)
    return @current_organization = nil unless clerk.organization_id

    @current_organization = Organization.find_or_create_by!(clerk_organization_id: clerk.organization_id)
  rescue ActiveRecord::RecordNotUnique
    @current_organization = Organization.find_by!(clerk_organization_id: clerk.organization_id)
  end

  def current_merchant
    @current_merchant ||= current_user&.merchant
  end
end

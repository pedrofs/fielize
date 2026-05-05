class ApplicationController < ActionController::Base
  include Authentication

  allow_browser versions: :modern

  helper_method :current_user, :current_organization, :current_merchant

  private

  def require_organization_user!
    redirect_to root_path unless current_user&.organizations&.any?
  end

  def require_merchant_user!
    redirect_to root_path unless current_user&.organization_memberships&.where.not(merchant_id: nil)&.any?
  end

  def current_user
    Current.user
  end

  def current_organization
    return @current_organization if defined?(@current_organization)
    return @current_organization = nil unless current_user

    @current_organization = if session[:current_organization_id]
      current_user.organizations.find_by(id: session[:current_organization_id])
    else
      current_user.organizations.first
    end
  end

  def current_merchant
    return @current_merchant if defined?(@current_merchant)
    return @current_merchant = nil unless current_user && current_organization

    membership = current_user.organization_memberships.find_by(
      organization: current_organization
    )
    @current_merchant = membership&.merchant
  end
end

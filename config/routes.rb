Rails.application.routes.draw do
  constraints(host: "127.0.0.1") do
    get "(*path)", to: redirect { |params, req| "#{req.protocol}localhost:#{req.port}/#{params[:path]}" }
  end

  resource :session, only: [ :new, :create, :destroy ]
  resources :passwords, param: :token, only: [ :new, :create, :edit, :update ]
  resource :registration, only: [ :new, :create ]
  resources :organizations, only: [ :new, :create, :edit, :update ]
  get "accept-invitation/:token", to: "invitation_acceptances#show", as: :accept_invitation
  post "accept-invitation", to: "invitation_acceptances#create", as: :accept_invitation_post

  root "home#index"

  scope module: :customer, as: :customer do
    get  "/o/:org_slug", to: "organizations#show", as: :organization
    get  "/o/:org_slug/c/:slug", to: "organizations/campaigns#show", as: :organization_campaign
    post "/o/:org_slug/c/:slug/enrollment", to: "organizations/campaigns/enrollments#create", as: :organization_campaign_enrollment

    get  "/v/:token", to: "verifications#show", as: :verification, constraints: { token: %r{[^/]+} }, format: false
    post "/verification_requests", to: "verification_requests#create", as: :verification_requests

    get    "/me",                       to: "profile#show",                           as: :profile
    delete "/me/session",               to: "sessions#destroy",                       as: :session
    post   "/me/verification_requests", to: "profile/verification_requests#create",   as: :profile_verification_requests

    resources :merchants, only: :show, param: :slug, path: "m" do
      resource :visit, only: :create, module: :merchants
    end
  end

  get "/manifest.json", to: "pwa#manifest", as: :pwa_manifest

  namespace :organizations do
    resources :merchants do
      resources :invitations, only: :create, module: :merchants
    end

    namespace :merchants do
      resources :geocodings, only: :create
    end

    resources :campaigns do
      resource  :activation,  only: :create, module: :campaigns
      resource  :termination, only: :create, module: :campaigns
      resources :merchants,   only: %i[create destroy], module: :campaigns
    end

    resources :memberships, only: %i[index update destroy]
    resource :switching, only: :create, module: :organizations, as: :switching
  end

  namespace :merchants do
    resource :loyalty_program, only: %i[show update] do
      resources :prizes, only: %i[new create edit update destroy], module: :loyalty_program
    end
    resources :campaigns,   only: :index
    resources :validations, only: %i[new create]
    resources :redemptions, only: %i[new create]
  end

  get "up" => "rails/health#show", as: :rails_health_check
end

Rails.application.routes.draw do
  # Redirect to localhost from 127.0.0.1 to use same IP address with Vite server
  constraints(host: "127.0.0.1") do
    get "(*path)", to: redirect { |params, req| "#{req.protocol}localhost:#{req.port}/#{params[:path]}" }
  end
  root "home#index"

  get "sign-in(/*path)", to: "auth#sign_in"
  get "sign-up(/*path)", to: "auth#sign_up"

  namespace :organizations do
    resources :merchants do
      resources :invitations, only: :create, module: :merchants
    end

    resources :campaigns do
      # State transitions modeled as their own sub-resources, RESTfully.
      # See "RESTful controllers only" in CLAUDE.md.
      resource :activation,  only: :create, module: :campaigns
      resource :termination, only: :create, module: :campaigns
    end
  end

  namespace :merchants do
    # Merchant-user-scoped routes (TBD)
  end
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker

  # Defines the root path route ("/")
  # root "posts#index"
end

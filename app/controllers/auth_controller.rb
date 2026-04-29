# frozen_string_literal: true

class AuthController < InertiaController
  def sign_in
    render inertia: "auth/sign_in"
  end

  def sign_up
    render inertia: "auth/sign_up"
  end
end

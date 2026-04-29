# frozen_string_literal: true

class HomeController < InertiaController
  before_action :require_clerk_session!

  def index
    render inertia: {}
  end
end

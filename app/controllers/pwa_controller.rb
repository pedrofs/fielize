# frozen_string_literal: true

# Serves the Web App Manifest at `/manifest.json`. The manifest is
# platform-wide (cross-Organization) so installed users get a single
# Fielize app icon that opens to the personal `/me` view.
class PwaController < ApplicationController
  allow_unauthenticated_access

  def manifest
    render template: "pwa/manifest", formats: [ :json ], layout: false
  end
end

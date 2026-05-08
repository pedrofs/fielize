# frozen_string_literal: true

# Geocoder backend is env-driven. Default is Nominatim (free, OSM-backed,
# rate-limited). Switching to Google Geocoding is a flag flip:
#
#   GEOCODER_LOOKUP=google GEOCODER_API_KEY=...
#
# See ADR-0004 (manual pin adjustment after geocoding) for why we still
# require admins to confirm pins regardless of backend accuracy.
Geocoder.configure(
  lookup: ENV.fetch("GEOCODER_LOOKUP", "nominatim").to_sym,
  api_key: ENV["GEOCODER_API_KEY"],
  use_https: true,
  timeout: 5,
  units: :km
)

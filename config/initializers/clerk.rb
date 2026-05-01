# frozen_string_literal: true

secret_key      = Rails.application.credentials.dig(:clerk, :secret_key)
publishable_key = Rails.application.credentials.dig(:clerk, :publishable_key)

# Skip configuration in environments without Clerk credentials (e.g. CI test runs).
# The Clerk SDK raises if secret_key is set to nil, so we only configure when present.
if secret_key.present?
  Clerk.configure do |c|
    c.secret_key      = secret_key
    c.publishable_key = publishable_key
    c.logger          = Rails.logger
  end
end

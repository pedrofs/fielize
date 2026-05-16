require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Fielize
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.1

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])

    # Use UUIDv7 as the primary key type for all tables. The
    # `default: -> { "uuidv7()" }` is added per-migration because Rails
    # generators don't expose a way to set it globally.
    # See CLAUDE.md "UUIDv7 primary keys".
    config.generators do |g|
      g.orm :active_record, primary_key_type: :uuid
    end

    # The whole product runs on Brazilian local time. The day-boundary
    # uniqueness on `visits` is computed in this zone too — see the
    # partial unique index added by `AddVisitDayUniqueIndex`. Changing
    # this value desyncs the model layer's "today" from the index's,
    # so do not flip it without coordinating both.
    config.time_zone = "America/Sao_Paulo"
  end
end

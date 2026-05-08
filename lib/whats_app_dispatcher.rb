# frozen_string_literal: true

# System-boundary adapter for sending WhatsApp messages. Per CLAUDE.md
# ("system-boundary integrations are jobs or `lib/` adapters, not
# services") this is a thin lib/ class — the WhatsAppDeliveryJob is the
# real boundary; this adapter is the swappable provider plug.
#
# In production, raises NotImplementedError until a provider plug-in
# (Meta Cloud API, Z-API, Twilio, …) is wired up via the
# `WHATSAPP_PROVIDER` env var. Tests substitute a recording fake by
# assigning `WhatsAppDispatcher.current = fake`.
class WhatsAppDispatcher
  class << self
    attr_writer :current

    def current
      @current ||= new
    end

    def dispatch_verification(customer:)
      current.dispatch_verification(customer: customer)
    end

    def reset!
      @current = nil
    end
  end

  def dispatch_verification(customer:)
    raise NotImplementedError,
          "Configure WHATSAPP_PROVIDER and a provider plug-in before sending in production. " \
          "Tests should set WhatsAppDispatcher.current to a recording fake."
  end
end

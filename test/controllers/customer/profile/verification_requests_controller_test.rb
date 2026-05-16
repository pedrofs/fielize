# frozen_string_literal: true

require "test_helper"

class Customer::Profile::VerificationRequestsControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  test "create re-enqueues the WhatsApp job for the cookie-identified, unverified customer" do
    sign_in_via_enrollment(phone: "(53) 99999-2222")
    customer = Customer.find_by(phone: "+5553999992222")
    refute customer.verified?

    assert_enqueued_with(job: WhatsAppDeliveryJob, args: [ { customer_id: customer.id } ]) do
      post "/me/verification_requests"
    end
    assert_redirected_to "/me"
  end

  test "create is a no-op for an already-verified customer" do
    sign_in_via_enrollment(phone: "(53) 99999-3333")
    customer = Customer.find_by(phone: "+5553999993333")
    customer.update!(verified_at: Time.current)

    assert_no_enqueued_jobs only: WhatsAppDeliveryJob do
      post "/me/verification_requests"
    end
    assert_redirected_to "/me"
  end

  test "create redirects to /me when there is no cookie at all" do
    assert_no_enqueued_jobs only: WhatsAppDeliveryJob do
      post "/me/verification_requests"
    end
    assert_redirected_to "/me"
  end

  private

  def sign_in_via_enrollment(phone:)
    post customer_organization_campaign_enrollment_path(
      organizations(:one).slug, campaigns(:pasaporte).slug
    ), params: { enrollment: { name: "Cliente", phone: phone } }
    # The enrollment itself enqueues a verification job — flush it so
    # the assertions below only see jobs from the explicit re-request.
    clear_enqueued_jobs
  end
end

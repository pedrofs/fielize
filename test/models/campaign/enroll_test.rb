# frozen_string_literal: true

require "test_helper"

class Campaign::EnrollTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @unverified = customers(:maria)
    @verified = customers(:joao)
    @org_campaign = campaigns(:pasaporte)
    @loyalty_campaign = campaigns(:cartao_calzados)
  end

  test "creates an Enrollment with consented_at on first call (OrganizationCampaign)" do
    enrollment = nil
    assert_difference -> { Enrollment.count }, +1 do
      enrollment = @org_campaign.enroll!(customer: @unverified)
    end
    assert_not_nil enrollment.consented_at
    assert_equal @unverified.id, enrollment.customer_id
    assert_equal @org_campaign.id, enrollment.campaign_id
  end

  test "is idempotent on (customer, campaign): repeat call neither creates nor changes consented_at" do
    first = @org_campaign.enroll!(customer: @unverified)

    assert_no_difference -> { Enrollment.count } do
      second = @org_campaign.enroll!(customer: @unverified)
      assert_equal first.id, second.id
      assert_equal first.consented_at.to_i, second.consented_at.to_i
    end
  end

  test "enqueues WhatsAppDeliveryJob on first call when customer is unverified" do
    assert_enqueued_with(job: WhatsAppDeliveryJob, args: [ { customer_id: @unverified.id } ]) do
      @org_campaign.enroll!(customer: @unverified)
    end
  end

  test "does not enqueue WhatsAppDeliveryJob when customer is already verified" do
    assert_no_enqueued_jobs only: WhatsAppDeliveryJob do
      @org_campaign.enroll!(customer: @verified)
    end
  end

  test "does not re-enqueue WhatsAppDeliveryJob on a repeat call" do
    @org_campaign.enroll!(customer: @unverified)

    assert_no_enqueued_jobs only: WhatsAppDeliveryJob do
      @org_campaign.enroll!(customer: @unverified)
    end
  end

  test "works on LoyaltyCampaign STI subtype with the same semantics" do
    enrollment = nil
    assert_difference -> { Enrollment.count }, +1 do
      assert_enqueued_with(job: WhatsAppDeliveryJob, args: [ { customer_id: @unverified.id } ]) do
        enrollment = @loyalty_campaign.enroll!(customer: @unverified)
      end
    end
    assert_equal @loyalty_campaign.id, enrollment.campaign_id
  end
end

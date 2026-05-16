# frozen_string_literal: true

require "test_helper"

class Visit::ScannableTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper

  setup do
    @merchant = merchants(:one)
    @customer = customers(:joao) # has no existing visits / enrollments
    @org_campaign = campaigns(:pasaporte)        # OrganizationCampaign covering merchant one
    @loyalty_campaign = campaigns(:cartao_calzados) # LoyaltyCampaign for merchant one
  end

  test "first scan creates a Visit, N pending Stamps sharing one code, and any missing Enrollments" do
    visit = nil
    assert_difference -> { Visit.count } => +1,
                      -> { Stamp.count } => +2,
                      -> { Enrollment.count } => +2 do
      visit = Visit.create_from_scan!(customer: @customer, merchant: @merchant)
    end

    assert_equal @customer, visit.customer
    assert_equal @merchant, visit.merchant

    stamps = visit.stamps.reload
    assert_equal 2, stamps.size
    assert stamps.all?(&:pending?)
    codes = stamps.map(&:code).uniq
    assert_equal 1, codes.size, "all stamps in a Visit share one code"
    assert_match(/\A\d{6}\z/, codes.first)

    campaign_ids = stamps.map(&:campaign_id).sort
    assert_equal [ @loyalty_campaign.id, @org_campaign.id ].sort, campaign_ids

    enrollments = Enrollment.where(customer: @customer)
    assert_equal [ @loyalty_campaign.id, @org_campaign.id ].sort,
                 enrollments.pluck(:campaign_id).sort
    enrollments.each { |e| assert_not_nil e.consented_at }
  end

  test "second scan the same day returns the existing Visit and creates no new records" do
    first = Visit.create_from_scan!(customer: @customer, merchant: @merchant)

    assert_no_difference -> { Visit.count } do
      assert_no_difference -> { Stamp.count } do
        assert_no_difference -> { Enrollment.count } do
          second = Visit.create_from_scan!(customer: @customer, merchant: @merchant)
          assert_equal first.id, second.id
        end
      end
    end
  end

  test "second scan same day after Merchant confirmation returns the existing (now-confirmed) Visit" do
    visit = Visit.create_from_scan!(customer: @customer, merchant: @merchant)
    code = visit.stamps.first.code
    @merchant.confirm_stamps(code: code)

    assert_no_difference -> { Visit.count } do
      assert_no_difference -> { Stamp.count } do
        result = Visit.create_from_scan!(customer: @customer, merchant: @merchant)
        assert_equal visit.id, result.id
        assert result.stamps.all?(&:confirmed?)
      end
    end
  end

  test "scan on a new day creates a fresh Visit while yesterday's pending stays untouched" do
    yesterday_visit = Visit.create_from_scan!(customer: @customer, merchant: @merchant)
    yesterday_stamp_ids = yesterday_visit.stamps.pluck(:id)
    # Backdate the Visit to yesterday in BRT so today's call creates a fresh one.
    Visit.where(id: yesterday_visit.id).update_all(local_day: Date.yesterday, created_at: 1.day.ago)

    assert_difference -> { Visit.count }, +1 do
      assert_difference -> { Stamp.count }, +2 do
        Visit.create_from_scan!(customer: @customer, merchant: @merchant)
      end
    end

    yesterday_stamp_ids.each do |id|
      assert Stamp.find(id).pending?, "yesterday's stamp should remain pending"
    end
  end

  test "partially-enrolled Customer gets missing Enrollments backfilled" do
    @org_campaign.enroll!(customer: @customer) # already enrolled in one of two

    assert_difference -> { Enrollment.count }, +1 do # only loyalty needs creating
      Visit.create_from_scan!(customer: @customer, merchant: @merchant)
    end

    assert Enrollment.exists?(customer: @customer, campaign: @loyalty_campaign)
  end

  test "Merchant with no active matching Campaigns yields a Visit with zero Stamps" do
    @org_campaign.update!(status: "ended")
    @loyalty_campaign.update!(status: "ended")

    visit = nil
    assert_difference -> { Visit.count }, +1 do
      assert_no_difference -> { Stamp.count } do
        assert_no_difference -> { Enrollment.count } do
          visit = Visit.create_from_scan!(customer: @customer, merchant: @merchant)
        end
      end
    end

    assert_equal 0, visit.stamps.count
  end

  test "all generated codes pass Stamp::CodeGenerator uniqueness predicate at the Merchant" do
    visit = Visit.create_from_scan!(customer: @customer, merchant: @merchant)
    code = visit.stamps.first.code

    # The collision generator should now avoid this code at this Merchant.
    sequence = [ code.to_i, 999_999 ]
    fake_random = Object.new
    fake_random.define_singleton_method(:random_number) { |_n| sequence.shift }
    assert_equal "999999", Stamp::CodeGenerator.call(merchant_id: @merchant.id, random: fake_random)
  end

  test "stamps share an expires_at far in the future so the legacy .valid scope still matches" do
    Visit.create_from_scan!(customer: @customer, merchant: @merchant)
    Stamp.where(status: "pending").each do |s|
      assert s.expires_at > 1.year.from_now, "expires_at should be far-future, was #{s.expires_at}"
    end
  end
end

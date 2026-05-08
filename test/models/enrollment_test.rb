# frozen_string_literal: true

require "test_helper"

class EnrollmentTest < ActiveSupport::TestCase
  setup do
    @customer = customers(:maria)
    @campaign = campaigns(:pasaporte)
  end

  test "is valid with a customer, a campaign, and consented_at" do
    enrollment = Enrollment.new(customer: @customer, campaign: @campaign, consented_at: Time.current)
    assert enrollment.valid?, enrollment.errors.full_messages.inspect
  end

  test "requires consented_at" do
    enrollment = Enrollment.new(customer: @customer, campaign: @campaign)
    refute enrollment.valid?
    assert_includes enrollment.errors[:consented_at], "can't be blank"
  end

  test "is unique on (customer, campaign)" do
    Enrollment.create!(customer: @customer, campaign: @campaign, consented_at: Time.current)
    duplicate = Enrollment.new(customer: @customer, campaign: @campaign, consented_at: Time.current)
    refute duplicate.valid?
  end
end

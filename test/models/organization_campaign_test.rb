require "test_helper"

class OrganizationCampaignTest < ActiveSupport::TestCase
  setup do
    @valid_attrs = {
      organization: organizations(:one),
      name: "OC Test",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    }
  end

  # ----- presence + dates -----

  test "starts_at and ends_at are required" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(starts_at: nil, ends_at: nil))
    refute campaign.valid?
    assert_includes campaign.errors[:starts_at], "can't be blank"
    assert_includes campaign.errors[:ends_at],   "can't be blank"
  end

  test "ends_at must be after starts_at" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(starts_at: 1.day.from_now, ends_at: 1.hour.from_now))
    refute campaign.valid?
    assert_includes campaign.errors[:ends_at], "must be after starts_at"
  end

  # ----- entry_policy -----

  test "entry_policy is required" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(entry_policy: nil))
    refute campaign.valid?
    assert_includes campaign.errors[:entry_policy], "is not included in the list"
  end

  # ----- merchant_id must be blank -----

  test "merchant_id must be blank" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(merchant: merchants(:one)))
    refute campaign.valid?
    assert_includes campaign.errors[:merchant_id], "must be blank for OrganizationCampaign"
  end

  # ----- policy_specific_config: cumulative -----

  test "cumulative forbids day_cap" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(entry_policy: "cumulative", day_cap: 1))
    refute campaign.valid?
    assert_includes campaign.errors[:day_cap], "must be blank for cumulative"
  end

  # ----- policy_specific_config: simple -----

  test "simple accepts a positive day_cap" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(entry_policy: "simple", day_cap: 1))
    assert campaign.valid?, campaign.errors.full_messages.inspect
  end

  test "simple rejects day_cap of 0" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(entry_policy: "simple", day_cap: 0))
    refute campaign.valid?
    assert_includes campaign.errors[:day_cap], "must be a positive integer when set"
  end

  test "simple allows day_cap nil (no cap)" do
    campaign = OrganizationCampaign.new(@valid_attrs.merge(entry_policy: "simple", day_cap: nil))
    assert campaign.valid?, campaign.errors.full_messages.inspect
  end

  # ----- domain methods -----

  test "merchants_stamped_by returns distinct merchant ids" do
    campaign = campaigns(:pasaporte)
    merchant_ids = campaign.merchants_stamped_by(customers(:maria))
    assert_includes merchant_ids, merchants(:one).id
    assert_equal merchant_ids.uniq, merchant_ids
  end

  test "entries_for cumulative counts prizes whose threshold is reached" do
    campaign = campaigns(:pasaporte)
    # maria has 1 confirmed stamp at merchant one (from fixtures); pasaporte has a prize at threshold 6
    # So she should NOT have unlocked any tier yet.
    assert_equal 0, campaign.entries_for(customers(:maria))
  end

  test "entries_for simple counts capped per day" do
    campaign = OrganizationCampaign.create!(@valid_attrs.merge(
      name: "Simple Cap", entry_policy: "simple", day_cap: 1, status: "active"
    ))
    # maria already has one confirmed stamp at merchant one via fixtures, but it's against pasaporte.
    # Create stamps against this new campaign manually.
    visit = Visit.create!(customer: customers(:maria), merchant: merchants(:one))
    Stamp.create!(
      visit: visit,
      campaign: campaign,
      customer: customers(:maria),
      merchant: merchants(:one),
      status: "confirmed",
      confirmed_at: Time.current
    )
    # Same day, second stamp at a different merchant.
    visit2 = Visit.create!(customer: customers(:maria), merchant: merchants(:one))
    Stamp.create!(
      visit: visit2,
      campaign: campaign,
      customer: customers(:maria),
      merchant: merchants(:one),
      status: "confirmed",
      confirmed_at: Time.current
    )
    # day_cap=1 caps it at 1 entry per day even though there are 2 stamps.
    assert_equal 1, campaign.entries_for(customers(:maria))
  end
end

require "test_helper"

class OrganizationCampaign::ActivatableTest < ActiveSupport::TestCase
  setup do
    @org = organizations(:one)
    @merchant = merchants(:one)
    @valid_attrs = {
      organization: @org,
      name: "Activatable Test",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    }
  end

  # ----- activate! happy path -----

  test "activate! flips draft → active when guards pass (cumulative)" do
    campaign = OrganizationCampaign.create!(@valid_attrs)
    campaign.prizes.create!(name: "Tier", threshold: 6)
    campaign.merchants << @merchant
    assert campaign.draft?

    assert campaign.activate!
    assert campaign.active?
  end

  test "activate! works for simple campaigns without thresholds" do
    campaign = OrganizationCampaign.create!(@valid_attrs.merge(entry_policy: "simple"))
    campaign.prizes.create!(name: "iPhone")
    campaign.merchants << @merchant

    assert campaign.activate!
    assert campaign.active?
  end

  # ----- activate! guard failures -----

  test "activate! fails when no prizes are configured" do
    campaign = OrganizationCampaign.create!(@valid_attrs)
    campaign.merchants << @merchant

    refute campaign.activate!
    assert campaign.draft?
    assert campaign.errors[:prizes].any?
  end

  test "activate! fails when a cumulative prize has no threshold" do
    campaign = OrganizationCampaign.create!(@valid_attrs)
    # Bypass Prize's own validation to simulate stale data.
    campaign.prizes.create!(name: "Bad Prize", threshold: 6) # OK
    campaign.prizes.build(name: "Bogus", threshold: nil).save(validate: false)
    campaign.merchants << @merchant

    refute campaign.activate!
    assert campaign.draft?
    assert campaign.errors[:prizes].any?
  end

  test "activate! fails when no merchants are enrolled" do
    campaign = OrganizationCampaign.create!(@valid_attrs)
    campaign.prizes.create!(name: "Tier", threshold: 6)

    refute campaign.activate!
    assert campaign.draft?
    assert campaign.errors[:merchants].any?
  end

  test "activate! is a no-op on non-draft campaigns" do
    campaign = OrganizationCampaign.create!(@valid_attrs)
    campaign.prizes.create!(name: "Tier", threshold: 6)
    campaign.merchants << @merchant
    campaign.activate!

    refute campaign.activate! # already active
    assert campaign.active?
  end

  # ----- end! -----

  test "end! flips active → ended" do
    campaign = OrganizationCampaign.create!(@valid_attrs)
    campaign.prizes.create!(name: "Tier", threshold: 6)
    campaign.merchants << @merchant
    campaign.activate!

    assert campaign.end!
    assert campaign.ended?
  end

  test "end! returns false on draft" do
    campaign = OrganizationCampaign.create!(@valid_attrs)
    refute campaign.end!
    assert campaign.draft?
  end

  test "end! returns false on already-ended" do
    campaign = OrganizationCampaign.create!(@valid_attrs)
    campaign.prizes.create!(name: "Tier", threshold: 6)
    campaign.merchants << @merchant
    campaign.activate!
    campaign.end!

    refute campaign.end!
    assert campaign.ended?
  end

  test "LoyaltyCampaign does not respond to activate! or end! from this concern" do
    # The concern is included only on OrganizationCampaign; ensure it didn't
    # leak onto sibling subclasses.
    assert_not_includes LoyaltyCampaign.included_modules, OrganizationCampaign::Activatable
  end
end

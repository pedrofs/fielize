require "test_helper"

class CampaignTest < ActiveSupport::TestCase
  test "STI dispatches to subclasses" do
    assert_equal "OrganizationCampaign", campaigns(:pasaporte).type
    assert_kind_of OrganizationCampaign, campaigns(:pasaporte)

    assert_equal "LoyaltyCampaign", campaigns(:cartao_calzados).type
    assert_kind_of LoyaltyCampaign, campaigns(:cartao_calzados)
  end

  test "Campaign.descendants resolves both subclasses after autoload" do
    OrganizationCampaign
    LoyaltyCampaign
    assert_equal %w[LoyaltyCampaign OrganizationCampaign], Campaign.descendants.map(&:name).sort
  end

  test "name and status presence" do
    campaign = OrganizationCampaign.new(organization: organizations(:one), name: nil)
    refute campaign.valid?
    assert_includes campaign.errors[:name], "can't be blank"
  end

  test "status is one of draft|active|ended" do
    campaign = OrganizationCampaign.new(
      organization: organizations(:one),
      name: "Test",
      status: "bogus",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    )
    refute campaign.valid?
    assert_includes campaign.errors[:status], "is not included in the list"
  end

  test "slug is unique within organization" do
    duplicate = OrganizationCampaign.new(
      organization: organizations(:one),
      name: campaigns(:pasaporte).name,
      slug: campaigns(:pasaporte).slug,
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    )
    refute duplicate.valid?
    assert_includes duplicate.errors[:slug], "has already been taken"
  end

  test "slug uniqueness is scoped to organization" do
    other_org_campaign = OrganizationCampaign.new(
      organization: organizations(:two),
      name: campaigns(:pasaporte).name,
      slug: campaigns(:pasaporte).slug,
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    )
    assert other_org_campaign.valid?, other_org_campaign.errors.full_messages.inspect
  end

  test "activate! and end! flip status" do
    campaign = OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "Draft Campaign",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "cumulative"
    )
    assert campaign.draft?

    campaign.activate!
    assert campaign.active?
    refute campaign.draft?

    campaign.end!
    assert campaign.ended?
    refute campaign.active?
  end

  test "Sluggable derives slug from name on create" do
    campaign = OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "Black Friday 2026",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "simple"
    )
    assert_equal "black-friday-2026", campaign.slug
  end

  test "Sluggable adds numeric suffix on collision within scope" do
    OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "Collision Test",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "simple"
    )
    second = OrganizationCampaign.create!(
      organization: organizations(:one),
      name: "Collision Test",
      starts_at: 1.day.from_now,
      ends_at: 1.month.from_now,
      entry_policy: "simple"
    )
    assert_equal "collision-test-2", second.slug
  end
end

require "test_helper"

class OrganizationTest < ActiveSupport::TestCase
  test "name is not required" do
    org = Organization.new
    assert org.valid?
  end

  test "slug is auto-generated from name and unique" do
    org = Organization.create!(name: "Test Org")
    assert_equal "test-org", org.slug

    duplicate = Organization.create!(name: "Test Org")
    refute_equal "test-org", duplicate.slug
  end

  test "destroying an organization cascades to merchants and campaigns" do
    org = Organization.create!(name: "Destroy A")
    merchant = org.merchants.create!(name: "M", latitude: 0, longitude: 0)
    campaign = org.organization_campaigns.create!(
      name: "Camp", starts_at: 1.day.from_now, ends_at: 1.month.from_now,
      entry_policy: "simple"
    )

    assert_difference -> { Merchant.count }, -1 do
      assert_difference -> { Campaign.count }, -1 do
        org.destroy
      end
    end

    refute Merchant.exists?(merchant.id)
    refute Campaign.exists?(campaign.id)
  end

  test "loyalty_campaigns association reaches through merchants" do
    org = organizations(:one)
    assert_includes org.loyalty_campaigns, campaigns(:cartao_calzados)
  end

  test "has rich text bio" do
    org = Organization.create!(name: "Bio Org")
    org.bio = "Hello <strong>world</strong>"
    org.save!
    org.reload
    assert_includes org.bio.to_s, "Hello"
    assert_includes org.bio.to_s, "<strong>world</strong>"
  end

  test "has rich text terms" do
    org = Organization.create!(name: "Terms Org")
    org.terms = "Term content"
    org.save!
    assert org.terms.body.to_s.include?("Term content")
  end

  test "has one attached hero image" do
    org = Organization.new(name: "Hero Org")
    assert_respond_to org, :hero_image
    assert_respond_to org, :hero_image=
  end

  test "primary_color must be a hex color when present" do
    org = Organization.new(name: "Color Org", primary_color: "not-a-color")
    refute org.valid?
    assert_includes org.errors[:primary_color], "must be a hex color (e.g. #1a2b3c)"
  end

  test "primary_color accepts a hex value" do
    org = Organization.new(name: "Color Org", primary_color: "#1a2b3c")
    assert org.valid?, org.errors.full_messages.to_sentence
  end

  test "secondary_color is optional but must be hex if present" do
    org = Organization.new(name: "Color Org", secondary_color: "")
    assert org.valid?, org.errors.full_messages.to_sentence

    org.secondary_color = "purple"
    refute org.valid?
    assert_includes org.errors[:secondary_color], "must be a hex color (e.g. #1a2b3c)"

    org.secondary_color = "#abcdef"
    assert org.valid?, org.errors.full_messages.to_sentence
  end
end

require "test_helper"

class SluggableTest < ActiveSupport::TestCase
  test "Organization derives slug from name on create" do
    org = Organization.create!(clerk_organization_id: "org_test_slug_a", name: "Acme Federation")
    assert_equal "acme-federation", org.slug
  end

  test "Organization handles collision with numeric suffix" do
    Organization.create!(clerk_organization_id: "org_test_slug_b1", name: "Same Name")
    second = Organization.create!(clerk_organization_id: "org_test_slug_b2", name: "Same Name")
    assert_equal "same-name-2", second.slug
  end

  test "Merchant slug is globally unique with numeric suffix on collision" do
    org_a = Organization.create!(clerk_organization_id: "org_test_slug_c1", name: "Org C1")
    org_b = Organization.create!(clerk_organization_id: "org_test_slug_c2", name: "Org C2")

    a = Merchant.create!(organization: org_a, name: "Twin")
    b = Merchant.create!(organization: org_b, name: "Twin")

    # Globally unique: same name in different orgs gets a numeric suffix.
    assert_equal "twin", a.slug
    assert_equal "twin-2", b.slug
  end

  test "explicit slug is preserved" do
    org = Organization.create!(
      clerk_organization_id: "org_test_slug_e",
      name: "Acme",
      slug: "custom-slug"
    )
    assert_equal "custom-slug", org.slug
  end

  test "blank source falls through without setting slug" do
    org = Organization.new(clerk_organization_id: "org_test_slug_f")
    org.valid?  # triggers before_validation
    assert_nil org.slug
  end
end

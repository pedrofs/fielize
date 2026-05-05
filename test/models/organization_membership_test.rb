require "test_helper"

class OrganizationMembershipTest < ActiveSupport::TestCase
  test "creating a membership requires organization and user" do
    membership = OrganizationMembership.new(role: :member)
    refute membership.valid?
    assert_includes membership.errors[:organization], "must exist"
    assert_includes membership.errors[:user], "must exist"
  end

  test "default role is member" do
    membership = OrganizationMembership.new(
      organization: organizations(:one),
      user: User.create!(email: "new@example.com", password: "password123")
    )
    assert membership.valid?
    assert_equal "member", membership.role
  end

  test "can be owner" do
    membership = OrganizationMembership.new(
      organization: organizations(:one),
      user: User.create!(email: "owner@example.com", password: "password123"),
      role: :owner
    )
    assert membership.valid?
    assert_equal "owner", membership.role
  end

  test "user organization membership is unique" do
    user = User.create!(email: "dup@example.com", password: "password123")
    OrganizationMembership.create!(organization: organizations(:one), user:)

    duplicate = OrganizationMembership.new(organization: organizations(:one), user:)
    refute duplicate.valid?
  end

  test "cannot remove last owner" do
    membership = organization_memberships(:admin_membership)
    membership.role = :member
    refute membership.valid?
    assert_includes membership.errors[:role], "deve ter pelo menos um proprietário"
  end
end

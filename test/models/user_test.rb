require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "email is required and unique" do
    blank = User.new
    refute blank.valid?
    assert_includes blank.errors[:email], "can't be blank"

    duplicate = User.new(email: users(:admin).email, password: "password123")
    refute duplicate.valid?
    assert_includes duplicate.errors[:email], "has already been taken"
  end

  test "password is required" do
    user = User.new(email: "test@example.com")
    refute user.valid?
    assert_includes user.errors[:password], "can't be blank"
  end

  test "email is normalized" do
    user = User.create!(email: "  TEST@Example.COM  ", password: "password123")
    assert_equal "test@example.com", user.email
  end

  test "redemptions association via merchant_user_id" do
    staff = users(:merchant_staff)
    redemption = Redemption.create!(
      customer: customers(:maria),
      campaign: campaigns(:cartao_calzados),
      prize: prizes(:cartao_cafe),
      merchant: merchants(:one),
      merchant_user: staff,
      threshold_snapshot: 5
    )
    assert_includes staff.redemptions, redemption
  end

  test "membership_for returns correct membership" do
    user = users(:admin)
    membership = user.membership_for(organizations(:one))
    assert membership
    assert_equal organizations(:one), membership.organization
  end

  test "owns_organization?" do
    admin = users(:admin)
    assert admin.owns_organization?(organizations(:one))
    refute users(:merchant_staff).owns_organization?(organizations(:one))
  end

  test "member_of?" do
    staff = users(:merchant_staff)
    assert staff.member_of?(organizations(:one))
    refute staff.member_of?(organizations(:two))
  end
end

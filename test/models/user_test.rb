require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "clerk_id is required and unique" do
    blank = User.new
    refute blank.valid?
    assert_includes blank.errors[:clerk_id], "can't be blank"

    duplicate = User.new(clerk_id: users(:admin).clerk_id)
    refute duplicate.valid?
    assert_includes duplicate.errors[:clerk_id], "has already been taken"
  end

  test "scope is mutually exclusive: organization XOR merchant" do
    both = User.new(
      clerk_id: "user_test_both",
      organization: organizations(:one),
      merchant: merchants(:one)
    )
    refute both.valid?
    assert_includes both.errors[:base],
      "user can belong to either an Organization or a Merchant, not both"
  end

  test "Organization-scoped user is valid" do
    user = User.new(clerk_id: "user_test_org", organization: organizations(:one))
    assert user.valid?, user.errors.full_messages.inspect
  end

  test "Merchant-scoped user is valid" do
    user = User.new(clerk_id: "user_test_merchant_unique", merchant: merchants(:one))
    assert user.valid?, user.errors.full_messages.inspect
  end

  test "user with neither scope is valid (unassociated)" do
    user = User.new(clerk_id: "user_test_neither")
    assert user.valid?, user.errors.full_messages.inspect
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
end

require "test_helper"

class VisitTest < ActiveSupport::TestCase
  test "requires customer and merchant" do
    visit = Visit.new
    refute visit.valid?
    assert_includes visit.errors[:customer], "must exist"
    assert_includes visit.errors[:merchant], "must exist"
  end

  test "valid visit persists" do
    visit = Visit.new(customer: customers(:maria), merchant: merchants(:one))
    assert visit.valid?, visit.errors.full_messages.inspect
    assert visit.save
  end

  test "destroying a visit cascades to its stamps" do
    visit = visits(:maria_at_calzados)
    stamp_count = visit.stamps.count
    assert_operator stamp_count, :>, 0

    assert_difference -> { Stamp.count }, -stamp_count do
      visit.destroy
    end
  end
end

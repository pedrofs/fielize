require "test_helper"

class LoyaltyCampaignLifecycleTest < ActiveSupport::TestCase
  setup do
    @loyalty = campaigns(:cartao_calzados)
    @merchant = @loyalty.merchant
    @customer = customers(:joao)
  end

  # ---- activate! ----

  test "activate! flips draft to active when prizes exist" do
    draft = create_draft
    draft.prizes.create!(name: "Café", threshold: 5, position: 0)

    draft.activate!
    assert draft.reload.active?
  end

  test "activate! raises RecordInvalid when no prizes" do
    draft = create_draft
    assert_raises(ActiveRecord::RecordInvalid) { draft.activate! }
    assert draft.reload.draft?
  end

  # ---- redeem! ----

  test "redeem! writes a redemption and snapshots threshold" do
    grant_visits(5)
    prize = prizes(:cartao_cafe)
    user = users(:merchant_staff)

    assert_difference -> { Redemption.count }, 1 do
      @loyalty.redeem!(customer: @customer, prize: prize, by: user)
    end
    redemption = Redemption.last
    assert_equal prize.threshold, redemption.threshold_snapshot
    assert_equal user.id, redemption.merchant_user_id
  end

  test "redeem! raises when balance is insufficient" do
    grant_visits(2)
    prize = prizes(:cartao_cafe)

    assert_no_difference -> { Redemption.count } do
      assert_raises(ActiveRecord::RecordInvalid) do
        @loyalty.redeem!(customer: @customer, prize: prize, by: users(:merchant_staff))
      end
    end
  end

  test "redeem! rejects a prize from a different campaign" do
    grant_visits(20)
    foreign = prizes(:pasaporte_iphone)

    assert_raises(ActiveRecord::RecordInvalid) do
      @loyalty.redeem!(customer: @customer, prize: foreign, by: users(:merchant_staff))
    end
  end

  private

  def create_draft
    other_merchant = merchants(:two)
    LoyaltyCampaign.create!(
      organization: other_merchant.organization, merchant: other_merchant,
      name: "Cartão Fidelidade", slug: "cartao-fidelidade-#{other_merchant.slug}",
      status: "draft"
    )
  end

  def grant_visits(n)
    n.times do |i|
      visit = @merchant.visits.create!(customer: @customer, created_at: i.seconds.ago)
      Stamp.create!(
        visit: visit, campaign: @loyalty, customer: @customer, merchant: @merchant,
        status: "confirmed", confirmed_at: Time.current, created_at: i.seconds.ago
      )
    end
  end
end

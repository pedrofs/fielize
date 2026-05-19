require "test_helper"

class Raffle::DrawerTest < ActiveSupport::TestCase
  test "returns nil for an empty pool" do
    assert_nil Raffle::Drawer.call(entries: [], seed: "abc")
  end

  test "is deterministic given the same entries and seed" do
    entries = %w[a b c d e f g h]
    seed = "fixed-seed-123"

    result_one = Raffle::Drawer.call(entries: entries, seed: seed)
    result_two = Raffle::Drawer.call(entries: entries, seed: seed)
    result_three = Raffle::Drawer.call(entries: entries, seed: seed)

    assert_equal result_one, result_two
    assert_equal result_one, result_three
  end

  test "different seeds eventually pick different winners" do
    entries = %w[a b c d e f g h]
    results = 50.times.map { |i| Raffle::Drawer.call(entries: entries, seed: "seed-#{i}") }
    assert_operator results.uniq.size, :>, 1
  end

  test "weighted entries: a customer appearing N times wins roughly N/total of the time" do
    entries = ([ "weighted" ] * 9) + [ "rare" ]
    seeds = 200.times.map { |i| "weighted-seed-#{i}" }
    results = seeds.map { |s| Raffle::Drawer.call(entries: entries, seed: s) }
    weighted_wins = results.count("weighted")
    # Expected ~180. Allow generous variance, just assert the weighting holds the right side of 50%.
    assert_operator weighted_wins, :>, 150,
      "weighted entry should dominate (expected >150 of 200, got #{weighted_wins})"
  end

  test "picks an element that is in the entries list" do
    entries = %w[alice bob carla]
    picked = Raffle::Drawer.call(entries: entries, seed: "x")
    assert_includes entries, picked
  end
end

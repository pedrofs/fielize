# frozen_string_literal: true

require "test_helper"

# Guards the customer-facing UI consistency rules from issue #68:
#
#   1. No hardcoded emerald/amber Tailwind palette classes — success/warning
#      surfaces must use the --success / --warning theme tokens so they adapt
#      to dark mode and per-org theming like the rest of the UI.
#   2. No structural emoji used as iconography (empty states, placeholders,
#      inline checks) — those must be lucide icons that render consistently
#      across platforms. Playful copy emoji (e.g. 🎉) are fine.
#
# This is a source-scan guard rather than a behavioural test because both rules
# are about how the markup is authored, not runtime behaviour.
class CustomerVisualConsistencyTest < ActiveSupport::TestCase
  FRONTEND_ROOT = Rails.root.join("app/frontend")

  # Customer-facing screens plus the shared wallet card they render.
  SCANNED_FILES = (
    Dir[FRONTEND_ROOT.join("pages/customer/**/*.tsx")] +
    [ FRONTEND_ROOT.join("components/wallet-card.tsx").to_s ]
  ).freeze

  # Tailwind palette classes that ignore dark mode and per-org theming.
  HARDCODED_PALETTE = /\b(?:bg|text|border|ring)-(?:emerald|amber)-\d{2,3}\b/

  # Emoji used as structural iconography. Playful copy emoji (🎉) are allowed.
  STRUCTURAL_EMOJI = %w[🤷 ✅ 💬 ⌛ 👋 ✓].freeze

  test "customer screens use success/warning tokens, never hardcoded emerald/amber" do
    offenders = SCANNED_FILES.each_with_object({}) do |path, acc|
      hits = File.read(path).scan(HARDCODED_PALETTE).uniq
      acc[relative(path)] = hits if hits.any?
    end

    assert offenders.empty?,
      "Hardcoded emerald/amber classes found (use --success/--warning tokens):\n" +
        offenders.map { |file, hits| "  #{file}: #{hits.join(', ')}" }.join("\n")
  end

  test "customer screens use lucide icons, not structural emoji" do
    offenders = SCANNED_FILES.each_with_object({}) do |path, acc|
      contents = File.read(path)
      hits = STRUCTURAL_EMOJI.select { |glyph| contents.include?(glyph) }
      acc[relative(path)] = hits if hits.any?
    end

    assert offenders.empty?,
      "Structural emoji found (replace with lucide icons; keep emoji only in playful copy):\n" +
        offenders.map { |file, hits| "  #{file}: #{hits.join(' ')}" }.join("\n")
  end

  private

  def relative(path)
    Pathname.new(path).relative_path_from(Rails.root).to_s
  end
end

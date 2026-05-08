# frozen_string_literal: true

require "application_system_test_case"

class Customer::CampaignDetailTest < ApplicationSystemTestCase
  test "anonymous Campaign detail renders hero, title, description, prizes, merchants, terms and Enroll CTA" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    campaign.description = "<div>Junte selos em <strong>cada lojista</strong> e concorra a prêmios.</div>"
    campaign.terms = "<div>Termos específicos da campanha.</div>"
    campaign.hero_image.attach(
      io: File.open(file_fixture("hero.png")),
      filename: "hero.png",
      content_type: "image/png"
    )
    campaign.save!

    visit "/o/#{organization.slug}/c/#{campaign.slug}"

    assert_selector "[data-testid='campaign-hero-image']"
    assert_text campaign.name
    assert_text "cada lojista"

    within "[data-testid='campaign-prizes']" do
      assert_text campaign.prizes.first.name
    end

    within "[data-testid='campaign-merchants']" do
      assert_text merchants(:one).name
    end

    within "[data-testid='campaign-terms']" do
      assert_text "Termos específicos"
    end

    cta = find("[data-testid='enroll-cta']")
    assert_match(/participar|enroll/i, cta.text)
  end

  test "campaign terms fall back to organization-level terms when not set on the campaign" do
    organization = organizations(:one)
    organization.terms = "<div>Termos padrão da organização.</div>"
    organization.save!

    campaign = campaigns(:pasaporte)
    # Ensure no campaign-level terms
    campaign.terms = ""
    campaign.save!

    visit "/o/#{organization.slug}/c/#{campaign.slug}"

    within "[data-testid='campaign-terms']" do
      assert_text "Termos padrão da organização"
    end
  end

  test "tapping a campaign card on the org page navigates to the campaign detail page" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)

    visit "/o/#{organization.slug}"

    find("[data-testid='campaign-card']", match: :first).click

    assert_current_path "/o/#{organization.slug}/c/#{campaign.slug}"
    assert_text campaign.name
  end

  test "renders a color band fallback when the campaign has no hero image" do
    organization = organizations(:one)
    campaign = campaigns(:pasaporte)
    campaign.hero_image.purge if campaign.hero_image.attached?

    visit "/o/#{organization.slug}/c/#{campaign.slug}"

    assert_selector "[data-testid='campaign-hero-band']"
    assert_no_selector "[data-testid='campaign-hero-image']"
  end
end

# frozen_string_literal: true

require "application_system_test_case"

class Customer::OrganizationBrandingTest < ApplicationSystemTestCase
  test "renders bio HTML, hero image, and theme colors derived from branding fields" do
    organization = organizations(:one)
    organization.update!(primary_color: "#ff5733", secondary_color: "#3357ff")
    organization.bio = "<div>Loja com <strong>30 anos</strong> de história</div>"
    organization.hero_image.attach(
      io: File.open(file_fixture("hero.png")),
      filename: "hero.png",
      content_type: "image/png"
    )
    organization.save!

    visit "/o/#{organization.slug}"

    assert_selector "[data-testid='org-hero-image']"
    assert_text "30 anos"

    layout = find("[data-testid='customer-layout']")
    assert_includes layout[:style], "--primary"
    assert_match(/#ff5733/i, layout[:style])
    assert_includes layout[:style], "--accent"
    assert_match(/#3357ff/i, layout[:style])
  end

  test "renders a gradient backdrop (not a blank header) when no hero image is set" do
    organization = organizations(:one)
    assert_not organization.hero_image.attached?

    visit "/o/#{organization.slug}"

    assert_selector "[data-testid='org-hero-gradient']"
    assert_no_selector "[data-testid='org-hero-image']"
  end

  test "overlaps the logo onto the hero and hides the gradient when a hero image is set" do
    organization = organizations(:one)
    organization.hero_image.attach(
      io: File.open(file_fixture("hero.png")),
      filename: "hero.png",
      content_type: "image/png"
    )
    organization.save!

    visit "/o/#{organization.slug}"

    assert_selector "[data-testid='org-hero-image']"
    assert_no_selector "[data-testid='org-hero-gradient']"
    assert_includes find("[data-testid='org-logo']")[:class], "absolute"
  end

  test "renders the bio left-aligned" do
    organization = organizations(:one)
    organization.bio = "<div>Loja com <strong>30 anos</strong> de história</div>"
    organization.save!

    visit "/o/#{organization.slug}"

    assert_includes find("[data-testid='org-bio']")[:class], "text-left"
  end
end

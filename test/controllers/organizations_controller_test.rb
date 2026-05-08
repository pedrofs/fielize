# frozen_string_literal: true

require "test_helper"

class OrganizationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    sign_in_as(users(:admin))
    @organization = organizations(:one)
  end

  test "update persists branding fields (colors, bio, terms, hero image)" do
    patch organization_path(@organization), params: {
      organization: {
        primary_color: "#ff5733",
        secondary_color: "#3357ff",
        bio: "<div>Bem-vindo</div>",
        terms: "<div>Termos padrão</div>",
        hero_image: fixture_file_upload("hero.png", "image/png")
      }
    }

    assert_redirected_to organizations_path
    @organization.reload
    assert_equal "#ff5733", @organization.primary_color
    assert_equal "#3357ff", @organization.secondary_color
    assert_includes @organization.bio.to_s, "Bem-vindo"
    assert_includes @organization.terms.to_s, "Termos padrão"
    assert @organization.hero_image.attached?
  end

  test "update rejects invalid hex color" do
    patch organization_path(@organization), params: {
      organization: { primary_color: "not-a-hex" }
    }

    assert_redirected_to edit_organization_path(@organization)
    @organization.reload
    refute_equal "not-a-hex", @organization.primary_color
  end
end

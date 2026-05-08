# frozen_string_literal: true

require "application_system_test_case"

class Customer::OrganizationLandingTest < ApplicationSystemTestCase
  test "renders org name and merchant list with addresses" do
    organization = organizations(:one)
    merchant = merchants(:one)

    visit "/o/#{organization.slug}"

    assert_text organization.name
    assert_text merchant.name
    assert_text merchant.address
  end

  test "renders the still-being-set-up placeholder when org has no merchants and no campaigns" do
    organization = organizations(:empty)

    visit "/o/#{organization.slug}"

    assert_text organization.name
    assert_text "ainda está sendo configurada"
  end
end

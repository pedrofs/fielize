require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 1400 ]

  def sign_in_as(user)
    visit "/session/new"
    fill_in "email", with: user.email
    fill_in "password", with: "password123"
    click_on "Entrar"
    assert_no_current_path "/session/new", wait: 5
  end
end

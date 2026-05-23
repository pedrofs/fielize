# frozen_string_literal: true

# Realistic fake-data seeder for testing the full app surface against a
# single Organization. Dev/staging only — refuses to run in production.
#
# Examples:
#   bin/rails demo:seed                                # most recent Org
#   bin/rails 'demo:seed[pedro-organizacao]'           # named Org
#   bin/rails 'demo:seed[pedro-organizacao,wipe]'      # destroy + reseed
namespace :demo do
  desc "Seed an Organization with merchants, customers, campaigns, stamps, raffles, and redemptions. Usage: bin/rails 'demo:seed[slug,wipe]'"
  task :seed, [ :slug, :wipe ] => :environment do |_, args|
    abort "demo:seed refuses to run in production." if Rails.env.production?

    slug = args[:slug].presence
    wipe = %w[1 true wipe yes].include?(args[:wipe].to_s.downcase)

    organization =
      if slug
        Organization.find_by(slug: slug) or abort %(No Organization with slug=#{slug.inspect}.)
      else
        Organization.order(:created_at).last or abort "No Organizations exist. Create one first."
      end

    Demo::Seeder.new(organization: organization, wipe: wipe).call
  end
end

module Demo
  class Seeder
    BR_DDDS        = %w[11 21 31 41 51 53 61 71 81 85 91].freeze
    FIRST_NAMES    = %w[Ana Bruno Carla Diego Eduarda Felipe Gabriela Henrique
                        Isabela João Karina Lucas Mariana Nelson Olívia Pedro
                        Queila Rafael Sofia Tiago Vinícius Helena Marcos Beatriz
                        Caio Larissa Murilo Renata Otávio Júlia].freeze
    LAST_NAMES     = %w[Silva Santos Oliveira Souza Lima Pereira Costa Almeida
                        Ribeiro Carvalho Gomes Martins Rocha Nunes Mendes
                        Cardoso Araújo Barbosa Teixeira Correia].freeze
    MERCHANT_NAMES = [
      "Padaria Central", "Café Aroma", "Pizzaria Toscana",
      "Hamburgueria Brasa", "Sorveteria Polar", "Açaí Tropical",
      "Bistrô do Centro", "Cantina Italiana", "Sushi House",
      "Empório Verde"
    ].freeze

    # Porto Alegre center — random offsets keep pins clustered but distinct.
    BASE_LAT = -30.0277
    BASE_LNG = -51.2287

    MERCHANT_COUNT  = MERCHANT_NAMES.size
    CUSTOMER_COUNT  = 200

    def initialize(organization:, wipe:)
      @organization = organization
      @wipe         = wipe
      @summary      = {}
      # Deterministic per org so repeated runs produce the same data.
      @prng         = Random.new(Digest::SHA256.hexdigest(@organization.id).to_i(16) % (2**62))
    end

    def call
      log "Seeding Organization #{@organization.name.inspect} (slug=#{@organization.slug})"
      wipe! if @wipe

      ActiveRecord::Base.transaction do
        seed_merchants
        seed_merchant_users
        seed_customers
        seed_campaigns
        seed_history
      end

      # Outside the transaction so a draw failure doesn't roll back the rest.
      draw_ended_campaign
      seed_loyalty_redemptions

      print_summary
    end

    private

    attr_reader :organization, :prng

    # --- Wipe -----------------------------------------------------------------

    def wipe!
      log "  Wiping previously-seeded scope (Org-owned campaigns, merchants, visits)..."
      campaign_ids = organization.campaigns.ids
      merchant_ids = organization.merchants.ids

      raffle_ids = Raffle.where(campaign_id: campaign_ids).ids
      Redemption.where(campaign_id: campaign_ids).delete_all
      RaffleEntry.where(raffle_id: raffle_ids).delete_all
      Raffle.where(id: raffle_ids).delete_all
      Stamp.where(merchant_id: merchant_ids).delete_all
      Visit.where(merchant_id: merchant_ids).delete_all
      Enrollment.where(campaign_id: campaign_ids).delete_all
      CampaignMerchant.where(campaign_id: campaign_ids).delete_all
      Prize.where(campaign_id: campaign_ids).delete_all
      Campaign.where(id: campaign_ids).delete_all
      # Detach (don't delete) Invitations and OrganizationMemberships that
      # point at merchants we're about to drop — these may be the user's real
      # team rows, only loosely associated with the demo merchants.
      Invitation.where(merchant_id: merchant_ids).update_all(merchant_id: nil)
      OrganizationMembership.where(merchant_id: merchant_ids).update_all(merchant_id: nil)
      Merchant.where(id: merchant_ids).delete_all
      log "  Wipe complete."
    end

    # --- Merchants ------------------------------------------------------------

    def seed_merchants
      @merchants = MERCHANT_NAMES.first(MERCHANT_COUNT).map.with_index do |name, i|
        merchant = organization.merchants.find_or_initialize_by(name: name)
        # Setting lat/long explicitly bypasses Geocoder (no network call).
        merchant.latitude  ||= BASE_LAT + prng.rand(-0.05..0.05)
        merchant.longitude ||= BASE_LNG + prng.rand(-0.05..0.05)
        merchant.address   ||= "Rua Demo, #{100 + i} — Porto Alegre/RS"
        merchant.save!
        merchant
      end
      @summary[:merchants] = @merchants.size
    end

    # --- Merchant users -------------------------------------------------------

    # One login per merchant: dev@<merchant-slug>.com / 123123123. Each user
    # is an org member scoped to that merchant — so logging in lands them on
    # the merchant side of the app (used by Loyalty#redeem and Stamp confirm).
    MERCHANT_USER_PASSWORD = "123123123"

    def seed_merchant_users
      @merchant_users = @merchants.map do |merchant|
        email = "dev@#{merchant.slug}.com"
        user = User.find_or_initialize_by(email: email)
        if user.new_record?
          user.first_name = "Dev"
          user.last_name  = merchant.name
          user.password   = MERCHANT_USER_PASSWORD
          user.save!
        end

        membership = OrganizationMembership.find_or_initialize_by(user: user, organization: organization)
        membership.merchant = merchant
        membership.role     = "member"
        membership.save!

        user
      end
      @summary[:merchant_users] = @merchant_users.size
    end

    # --- Customers ------------------------------------------------------------

    def seed_customers
      @customers = Array.new(CUSTOMER_COUNT) do |i|
        ddd   = BR_DDDS[i % BR_DDDS.size]
        # 9XXXXXXXX — 9 digits, starts with 9 (BR mobile). Index keeps them unique.
        phone = "+55#{ddd}9#{format('%08d', 70_000_000 + i)}"
        first = FIRST_NAMES[i % FIRST_NAMES.size]
        last  = LAST_NAMES[(i / FIRST_NAMES.size) % LAST_NAMES.size]

        Customer.find_or_create_by!(phone: phone) do |c|
          c.name             = "#{first} #{last}"
          c.lgpd_opted_in_at = Time.current
          c.verified_at      = Time.current  # avoids WhatsApp delivery on enroll
        end
      end
      @summary[:customers] = @customers.size
    end

    # --- Campaigns ------------------------------------------------------------

    def seed_campaigns
      @campaigns = []

      # Two active LoyaltyCampaigns on the first two merchants.
      @loyalty_a = build_loyalty(
        merchant: @merchants[0], name: "Cartão do Café",
        prizes: [
          { name: "Café grátis",      threshold: 5,  position: 0 },
          { name: "Combo bebida+doce", threshold: 10, position: 1 }
        ],
        status_after: :active
      )
      @campaigns << @loyalty_a

      @loyalty_b = build_loyalty(
        merchant: @merchants[1], name: "Cartão da Pizza",
        prizes: [ { name: "Pizza grátis", threshold: 10, position: 0 } ],
        status_after: :active
      )
      @campaigns << @loyalty_b

      # Active cumulative OrganizationCampaign.
      @org_cumulative = build_org(
        name: "Sorteio dos Bairros — Acumulativo",
        entry_policy: "cumulative",
        starts_at: 45.days.ago, ends_at: 30.days.from_now,
        prizes: [
          { name: "Brinde Bronze",   threshold: 2, position: 0 },
          { name: "Voucher R$ 50",   threshold: 4, position: 1 },
          { name: "Voucher R$ 100",  threshold: 7, position: 2 }
        ],
        status_after: :active
      )
      @campaigns << @org_cumulative

      # Ended simple OrganizationCampaign — drawn later, gives us raffles+winners.
      @org_simple_ended = build_org(
        name: "Sorteio Aniversário — Simples",
        entry_policy: "simple",
        starts_at: 90.days.ago, ends_at: 1.day.ago,
        day_cap: 2,
        prizes: [
          { name: "Vale R$ 100", position: 0 },
          { name: "Vale R$ 200", position: 1 },
          { name: "Vale R$ 500", position: 2 }
        ],
        status_after: :ended
      )
      @campaigns << @org_simple_ended

      # Draft OrganizationCampaign — exercises the "not yet active" UI path.
      @org_draft = build_org(
        name: "Próximo Sorteio — Em Preparação",
        entry_policy: "cumulative",
        starts_at: 7.days.from_now, ends_at: 60.days.from_now,
        prizes: [
          { name: "Prêmio a definir", threshold: 3, position: 0 }
        ],
        status_after: :draft
      )
      @campaigns << @org_draft

      @summary[:campaigns] = @campaigns.size
    end

    def build_loyalty(merchant:, name:, prizes:, status_after:)
      campaign = LoyaltyCampaign.find_or_initialize_by(merchant: merchant)
      campaign.organization = organization
      campaign.name         = name
      campaign.status       = "draft" if campaign.new_record?
      campaign.save!

      upsert_prizes(campaign, prizes)
      campaign.activate! if status_after == :active && campaign.draft?
      campaign
    end

    def build_org(name:, entry_policy:, starts_at:, ends_at:, prizes:, status_after:, day_cap: nil)
      campaign = OrganizationCampaign.find_or_initialize_by(organization: organization, name: name)
      campaign.entry_policy = entry_policy
      campaign.starts_at    = starts_at
      campaign.ends_at      = ends_at
      campaign.day_cap      = day_cap
      campaign.status       = "draft" if campaign.new_record?
      campaign.save!

      upsert_prizes(campaign, prizes)
      campaign.attach_all_missing_merchants!

      case status_after
      when :active
        campaign.activate! if campaign.draft?
      when :ended
        campaign.activate! if campaign.draft?
        campaign.end!      if campaign.active?
      end
      campaign
    end

    def upsert_prizes(campaign, prizes)
      prizes.each do |attrs|
        prize = campaign.prizes.find_or_initialize_by(name: attrs[:name])
        prize.position  = attrs[:position]
        prize.threshold = attrs[:threshold] if attrs.key?(:threshold)
        prize.save!
      end
    end

    # --- Visits + Stamps ------------------------------------------------------

    def seed_history
      visit_count = 0
      stamp_count = 0

      @campaigns.each do |campaign|
        next if campaign.draft?

        merchants_for_campaign = campaign.is_a?(LoyaltyCampaign) ? [ campaign.merchant ] : campaign.merchants.to_a
        share = campaign.is_a?(LoyaltyCampaign) ? 0.30 : 0.60
        participating = @customers.sample((CUSTOMER_COUNT * share).to_i, random: prng)

        participating.each do |customer|
          Enrollment.find_or_create_by!(customer: customer, campaign: campaign) do |e|
            e.consented_at = random_time_in_window(campaign)
          end

          visit_days = Array.new(1 + prng.rand(15)) { random_date_in_window(campaign) }.uniq
          visit_days.each do |day|
            merchant = merchants_for_campaign.sample(random: prng)

            visit = Visit.find_by(customer: customer, merchant: merchant, local_day: day)
            unless visit
              created_at = day.in_time_zone.change(hour: 9 + prng.rand(12), min: prng.rand(60))
              visit = Visit.create!(
                customer: customer, merchant: merchant, local_day: day,
                created_at: created_at, updated_at: created_at
              )
              visit_count += 1
            end

            next if Stamp.exists?(visit_id: visit.id, campaign_id: campaign.id)

            confirmed_at = visit.created_at + 5.minutes
            Stamp.create!(
              visit: visit, campaign: campaign, customer: customer, merchant: merchant,
              status: "confirmed", confirmed_at: confirmed_at,
              created_at: confirmed_at
            )
            stamp_count += 1
          end
        end
      end

      @summary[:visits]      = visit_count
      @summary[:stamps]      = stamp_count
      @summary[:enrollments] = Enrollment.where(campaign_id: @campaigns.map(&:id)).count
    end

    # --- Raffle + redemptions -------------------------------------------------

    def draw_ended_campaign
      return unless @org_simple_ended&.ended?

      @org_simple_ended.draw!
      raffles = @org_simple_ended.raffles
      @summary[:raffles] = raffles.count

      # Mark the first winner as delivered so the redemption UI is populated.
      winner_raffle = raffles.where(status: "drawn").first
      if winner_raffle
        @org_simple_ended.redeem!(
          customer: winner_raffle.winner_customer,
          prize:    winner_raffle.prize,
          by:       organization.users.first
        )
        @summary[:raffle_redemptions] = 1
      end
    end

    def seed_loyalty_redemptions
      delivered = 0
      LoyaltyCampaign.where(organization: organization, status: "active").find_each do |loyalty|
        # Loyalty redemptions require the redeemer to be a member of the
        # merchant. Pick one if present, otherwise leave the redemption
        # un-attributed (the field is optional).
        redeemer = loyalty.merchant.users.first

        top_customers = loyalty.stamps.confirmed.group(:customer_id).count
                               .sort_by { |_, n| -n }.first(5).map(&:first)
        top_customers.each do |customer_id|
          customer  = Customer.find(customer_id)
          balance   = loyalty.balance_for(customer)
          claimable = loyalty.prizes.where("threshold <= ?", balance).order(threshold: :desc).first
          next unless claimable

          loyalty.redeem!(customer: customer, prize: claimable, by: redeemer)
          delivered += 1
        end
      end
      @summary[:loyalty_redemptions] = delivered
    end

    # --- Helpers --------------------------------------------------------------

    def random_time_in_window(campaign)
      from = (campaign.starts_at || 60.days.ago).to_time
      to   = [ Time.current, (campaign.ends_at || Time.current) ].min
      to   = from + 1.day if to <= from
      Time.zone.at(prng.rand(from.to_i..to.to_i))
    end

    def random_date_in_window(campaign)
      random_time_in_window(campaign).to_date
    end

    def log(msg)
      puts msg
    end

    def print_summary
      puts ""
      puts "Done. Summary:"
      @summary.each { |key, value| puts "  #{key.to_s.ljust(22)} #{value}" }
    end
  end
end

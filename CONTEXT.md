# Fielize

A multi-tenant loyalty platform where **Customers** earn **Stamps** at **Merchants** by scanning QR codes, redeemable for **Prizes** inside **Campaigns** run by an **Organization**. Customers can also pre-enroll in **Campaigns** from an **Organization**'s public landing page before ever visiting a **Merchant**.

## Language

**Organization**:
A multi-merchant entity (e.g. a CDL — Câmara de Dirigentes Lojistas) that operates a public landing page and runs **Campaigns** across its **Merchants**.
_Avoid_: tenant, account, brand

**Merchant**:
A physical store that belongs to an **Organization** and where **Customers** scan QR codes to earn **Stamps**.
_Avoid_: store, vendor, retailer

**User**:
A staff member (Organization owner, member, or merchant-user) who logs in to administer the platform. Distinct from **Customer**.
_Avoid_: admin, operator

**Customer**:
A person identified by a phone number (E.164, WhatsApp-capable) who participates in **Campaigns**. **Platform-level, not tenanted** — one **Customer** record can hold **Enrollments** in **Campaigns** from many different **Organizations**. Distinct from **User** — never authenticates with a password; identified by signed cookie + phone.
_Avoid_: user, member, account, shopper

**Campaign**:
A loyalty program defined by an **Organization**. Two kinds: a per-merchant **LoyaltyCampaign** (punchcard) and an **OrganizationCampaign** that spans multiple **Merchants**. **OrganizationCampaign** lifecycle: `draft → active → ended → drawn`. The `drawn` transition runs all the campaign's **Raffles** in one shot and is triggered manually by the org user (no auto-draw on end — the org typically wants ceremonial control over *when* winners are announced).
_Avoid_: program, promotion

**Visit**:
A single interaction where a **Customer** scans a **Merchant**'s QR code. Produces **Stamps** for every active **Campaign** that covers the **Merchant** and that the **Customer** is enrolled in.
_Avoid_: check-in, scan event

**Stamp**:
A unit of progress earned by a **Customer** in a **Campaign** during a **Visit**. Two states: `pending` (awaits validation by a merchant-user) and `confirmed`.
_Avoid_: point, punch, credit

**Prize**:
A reward configured on a **Campaign** that a **Customer** can claim once they reach the configured threshold of confirmed **Stamps**.
_Avoid_: reward, gift, voucher

**Redemption**:
The act of a **Customer** claiming a **Prize** they're entitled to, recorded against a **Customer** + **Campaign** + **Prize**. Generalised across both **Campaign** types — the *entitlement* differs but the act is the same:
- In a **LoyaltyCampaign**, the **Customer** redeems at a specific **Merchant** once they hit the **Prize** threshold; validated by a merchant-side **User**.
- In an **OrganizationCampaign**, the **Customer** redeems at the **Organization** (e.g., CDL HQ — no **Merchant** involved) the **Prize** they won via a **Raffle**; validated by an organization-side **User**. The **Redemption** points back to the specific winning **Raffle**.

The validator column is generalised to `redeemed_by_user_id` (was `merchant_user_id`). For loyalty it's the merchant-side **User**; for organization-campaign raffle redemptions it's the org-side **User** marking "entregue".
_Avoid_: claim, payout

**Raffle**:
The draw that picks a winning **Customer** for a single **Prize** at the end of an **OrganizationCampaign**. Scoped per-**Prize** (one **Raffle** per **Prize**), not per-**Campaign** — `prize.raffle.winner` is the natural reference. **LoyaltyCampaigns** have no **Raffles**; their **Prizes** are redeemed directly. Holds the drawn-at timestamp, the winner (a **Customer**), and the seed used so the draw is replayable. **Order**: when the **Campaign** ends, **Raffles** run in `Prize.position` order; the org user controls draw order by ordering **Prizes** in the form. **Constraint**: a **Customer** can win at most one **Prize** per **Campaign** — once drawn for one **Prize**, they are excluded from the entry pools of the remaining **Raffles** in the same **Campaign**.
_Avoid_: drawing, lottery, giveaway, sorteio (Portuguese-only term — use **Raffle** in code/types, "Sorteio" only in UI copy)

**Raffle Entry**:
A literal "slip in the hat" — one **Customer**'s presence in the pool of a single **Raffle**. Materialised at draw time, one record per individual entry: a **Customer** with 10 confirmed **Stamps** in a `simple` **Campaign** produces 10 **Raffle Entries** per **Prize** they're eligible for; a **Customer** who crossed a `cumulative` **Prize**'s threshold produces 1 **Raffle Entry** for that **Prize**. During an active **Campaign**, entry counts are computed on the fly (no records); the rows only exist post-draw. Marked with the winning **Raffle** when drawn.
_Avoid_: ticket, ballot, chance

**Empty pool**: a **Raffle** whose eligible pool was empty at draw time is still recorded — `status: "no_winner"`, `winner_customer_id: nil`. The other **Raffles** in the same **Campaign** still run. The **Prize** is not retroactively revived; redraws are an explicit, org-user-triggered follow-on (out of v1 scope).

**Enrollment**:
A **Customer**'s attachment to a **Campaign**, capturing phone + LGPD opt-in. Created either *explicitly* (tapping "Enroll" on the **Organization**'s landing page) or *implicitly* (the first **Visit** at a covered **Merchant** auto-enrolls into every active **Campaign** that covers that **Merchant**). Both paths converge on the same **Customer** record, keyed by phone.
_Avoid_: subscription, signup, opt-in

## Customer App (Wallet)

**Wallet**:
The **Customer**'s cross-**Organization** mobile home (PWA `start_url: /me`, Fielize-branded — neutral chrome, not org-themed), reached via the **Cartões** tab of a two-tab bottom toolbar (**Cartões** + **Perfil**) that is present on *every* customer-facing page (it lives in the shared customer layout), including org-branded drill-downs. Lists one **Card** per **Enrollment** across every **Organization** the **Customer** joined, organized into state-first sections: **Para resgatar** (redemption-ready, floated to the top across all orgs), **Ativas** (still collecting), and a collapsed **Encerradas** (lost / fully redeemed / disabled). Org-branded screens (`/o/:org_slug/…`) remain reachable as drill-downs.
_Avoid_: dashboard, feed, home

**Card**:
The customer-facing representation of one **Enrollment** plus its live progress and state, shown in the **Wallet** and openable to a detail page (**Prizes**, terms, participating **Merchants**, outcome). A **LoyaltyCampaign** renders a punchcard (confirmed-**Stamp** balance vs **Prize** threshold); an **OrganizationCampaign** renders a passport (`cumulative`: distinct **Merchants** stamped vs threshold) or a raffle-ticket tally (`simple`: number of entries). "Stamp card" is the UI metaphor, not a new persisted entity — a **Card** is a projection over an **Enrollment**.
_Avoid_: tile, widget

**Redemption-ready**:
The **Card** state floated into **Para resgatar**. For a **LoyaltyCampaign**: the confirmed-**Stamp** balance has reached a **Prize** threshold (redeem at the **Merchant**). For an **OrganizationCampaign**: the **Customer** won a **Raffle** and has not yet redeemed (redeem at the **Organization** HQ). A win is never hidden, even after the **Campaign** is drawn.
_Avoid_: claimable, unlocked

## Relationships

- A **Wallet** shows one **Card** per **Enrollment**; **Cards** span multiple **Organizations**.
- An **Organization** has many **Merchants** and runs many **Campaigns**.
- A **Campaign** is either scoped to one **Merchant** (**LoyaltyCampaign**) or spans many (**OrganizationCampaign**).
- A **Visit** belongs to exactly one **Customer** and one **Merchant**.
- A **Visit** produces zero or more **Stamps** — one per **Campaign** that (a) is active, (b) covers the **Merchant**, and (c) the **Customer** is enrolled in.
- A **Customer** has many **Enrollments** across **Campaigns** — possibly spanning multiple **Organizations**; on the first **Visit** to a **Merchant**, the **Customer** is auto-enrolled into every active **Campaign** covering that **Merchant**.
- **Customers** are **not** tenanted to **Organizations**: phone is unique platform-wide; the same person interacting with two **Organizations** is one **Customer** with two sets of **Enrollments**.
- A **Prize** belongs to a **Campaign**; a **Redemption** records a **Customer** claiming a **Prize** at a **Merchant**.

## Example dialogue

> **Dev:** "If a **Customer** taps Enroll on the org page for **Campaign** A and never visits, what's their state?"
> **Domain expert:** "They're an **Enrolled Customer** with zero **Stamps**. They count toward acquisition, not engagement."
>
> **Dev:** "And if they walk into Merchant X, which is covered by both **Campaign** A and **Campaign** B?"
> **Domain expert:** "The scan creates a **Visit**, that **Visit** produces one **Stamp** for A (already enrolled) and auto-enrolls them into B with one **Stamp** for B."

## Flagged ambiguities

- "**Customer**" vs "**User**" — kept distinct: **Customers** are phone-identified loyalty participants; **Users** are authenticated staff. Never collapse the two.
- "Enroll" was initially fuzzy (could mean "first scan" or "explicit signup"). Resolved: **Enrollment** covers both paths and is the canonical attachment of a **Customer** to a **Campaign**.

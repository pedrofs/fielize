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
A loyalty program defined by an **Organization**. Two kinds: a per-merchant **LoyaltyCampaign** (punchcard) and an **OrganizationCampaign** that spans multiple **Merchants**.
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
The act of a **Customer** claiming a **Prize** at a **Merchant**, recorded against a **Customer** + **Campaign** + **Prize** + **Merchant**.
_Avoid_: claim, payout

**Enrollment**:
A **Customer**'s attachment to a **Campaign**, capturing phone + LGPD opt-in. Created either *explicitly* (tapping "Enroll" on the **Organization**'s landing page) or *implicitly* (the first **Visit** at a covered **Merchant** auto-enrolls into every active **Campaign** that covers that **Merchant**). Both paths converge on the same **Customer** record, keyed by phone.
_Avoid_: subscription, signup, opt-in

## Relationships

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

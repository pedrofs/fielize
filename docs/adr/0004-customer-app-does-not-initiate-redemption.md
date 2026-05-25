# Customer app surfaces redemption-readiness but never initiates redemption

The customer **Wallet** (the cross-org mobile app at `/me`) shows when a **Card** is **Redemption-ready** — a **LoyaltyCampaign** balance that crossed a **Prize** threshold, or an **OrganizationCampaign** **Raffle** the **Customer** won — and floats it into the **Para resgatar** section. But the affordance is purely informational: it tells the **Customer** what to do ("mostre seu WhatsApp no caixa" / "entre em contato com a organização para retirar"). It never transacts.

Redemption remains **staff-initiated**, exactly as it already works: a merchant **User** looks the **Customer** up by phone at `merchants/redemptions/new` and confirms a **LoyaltyCampaign** **Prize**; an org **User** marks a won **Raffle**'s **Prize** delivered from the campaign admin page. The **Customer** presents nothing but (implicitly) their phone.

## Considered options

- **Show a redemption code/QR the staff scans/enters.** Rejected for v1: staff redemption is keyed by phone lookup, not a code — this would add a new code-entry redemption path on both sides.
- **Customer "requests" redemption (a pending state staff approve).** Rejected for v1: adds a new `Redemption` sub-state, a staff approval queue, and race/abuse handling.

## Consequences

There is deliberately **no in-app "redeem" button**. A future engineer should not treat its absence as an oversight. If we later want in-app redemption, the code/QR option is the smaller of the two rejected paths and the natural next step.

# Vision — Fielize

## What we're building

A multi-tenant campaign-management platform for Brazilian merchant associations (CDLs). Each CDL operates a white-labeled instance that lets it run loyalty and reward campaigns across its associate merchants — passport stamp campaigns, raffles, individual loyalty cards, seasonal promotions — with shared infrastructure and zero per-campaign reset cost.

## Why this exists

CDLs in Brazil are local merchant associations. Their historical value proposition was access to **SPC Brasil** — the credit-check service that lets merchants verify customer creditworthiness and report defaults. For decades that was the killer reason to be associated.

That value is being commoditized. Serasa, Bureau de Crédito, fintechs, and bank-integrated solutions have eaten into it. Many small-city CDLs are quietly losing relevance because their core scarce product is no longer scarce. Diretorias feel this even if they don't say it openly. Member retention is a quiet anxiety.

A campaign platform — and especially per-merchant Cartão Fidelidade as an always-on benefit — is positioned as the *next* killer service. Not as a "promotional add-on" but as a candidate replacement value driver that justifies the membership fee in the years SPC continues to decline.

## Who we're building for

### CDL Jaguarão — launch customer

Small border city in Rio Grande do Sul (~25k inhabitants) on the Brazil-Uruguay border. CDL Jaguarão already runs a tourist-facing campaign called "Pasaporte de Compras" — a paper folder with manual stamps, distributed to Uruguayan visitors crossing the frontier from Rio Branco. The campaign achieved 50% merchant adoption (strong supply-side signal) but failed on the demand side: tourists didn't understand the flow, didn't deposit passports in collection urns, no data was captured, no impact was reportable to associates.

That failed campaign cost R$3,000. It's our pricing anchor: any pilot ≤ R$3,000 with measurable data is a clear win.

The current operator pitched our platform internally and is presenting it to her diretoria. Pilot is essentially confirmed pending board approval.

### CDL national federation — long-term market

Approximately **1,200 local CDLs** under the CNDL (Confederação Nacional dos Dirigentes Lojistas) federation, across 27 states. Each is autonomous: sets its own bylaws, fees, and campaigns; volunteer-led with one paid diretor executivo running operations.

Conservative SaaS math: 50 CDLs at R$2k/month = R$1.2M ARR. The product is identical for one customer or fifty — what scales is sales motion, not engineering.

## The wedge: Pasaporte de Compras digitized

The launch artifact is digitizing the existing Pasaporte de Compras at CDL Jaguarão for its next edition. This is the lowest-risk, highest-clarity wedge:

- The CDL already has 50% merchant adoption (the hardest cold-start problem in coalition products is already solved).
- The previous edition's failure modes map one-to-one to product features: tourists didn't understand → simpler digital flow; passports didn't return to urns → automatic raffle entry; no data → real-time dashboard.
- Pilot is free for the CDL. Risk is asymmetric in their favor.

Upon delivering on the pilot, we expand to other campaign templates within the same CDL (Cartão Fidelidade for individual merchants, Black Friday raffle, Mother's Day, Christmas), then to other CDLs.

## Strategic positioning vs. existing tools

- **Fidelimax / Fidelizi** are single-merchant loyalty SaaS. Not coalition-aware. We're orthogonal.
- **CashLocal** (Pato Branco) and **Ache no Bairro** (MS/MT) are consumer-facing coalition apps. They sell to consumers, not associations. Our distribution is fundamentally different.
- **Câmaras Net** and similar CDL software vendors handle membership management, billing, communication. Not campaigns. We're complementary at most, not competitive.
- The *shape* most similar to what we're building is **Fivestars** (US, acquired by SumUp) — but they targeted individual SMB merchants, not associations. The association layer is the moat.

## Commercial path

**Pilot phase (months 1–3):** free to CDL Jaguarão. Build, deploy, iterate based on field data. Measure success against the R$3,000 baseline of the manual campaign.

**Validation (months 3–6):** if Pasaporte digitized produces measurable lift (foot traffic captured, contacts opt-in, post-campaign reusability), pitch a paid annual contract to CDL Jaguarão. Concurrently approach 2–3 other CDLs in RS via FCDL/RS introductions.

**Growth (year 2):** sales-led expansion to other CDLs, leveraging the FCDL state federations as distribution. Pricing sized to be cheaper than running one paper campaign per year.

## The 2 things we must not break

1. **Multi-tenant from day one.** Even with one customer. The cost of retrofitting tenancy later is enormous; the cost of having it now is negligible.
2. **Friction must be lower for merchants than the paper version they already do.** If a single merchant has to install an app, log in, or scan customer phones, we lose. Customer-scan-only is a hard constraint.

## What success looks like 12 months out

- 5–10 CDLs onboarded
- 200+ merchants active across them
- 20k+ identified consumers in the platform
- Cartão Fidelidade as the dominant template by usage (because it's always-on)
- One referenceable customer story showing campaign measurability replacing manual processes

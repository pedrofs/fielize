# Painel Vizinho / Fielize — Overview

Product strategy lives in [`../ai_docs/vision.md`](../ai_docs/vision.md);
visual references in [`../ai_docs/wireframes.html`](../ai_docs/wireframes.html);
the data contract in [`./01-data-model.md`](./01-data-model.md).

This file is the **flow + screen catalogue**. It lists every user flow we
know we need to support, organized by persona, with wireframes inline.
Implementation plans split by persona will live in `02-impl-admin.md`,
`03-impl-merchant.md`, `04-impl-customer.md` (added later).

## Personas

- **Organization user (Admin)** — the CDL operator. One per Organization for
  v1 (no roles inside an org yet). Acts via Clerk org membership.
- **Merchant user** — the lojista (or staff). Belongs to exactly one
  Merchant. Acts via Clerk + invitation flow with `merchant_id` in
  `public_metadata`.
- **Customer** — the end consumer. Not a Clerk user. Identified by phone
  (E.164); WhatsApp number captured at first scan; LGPD opt-in mandatory.
  Verification of WhatsApp number happens asynchronously via a link the
  customer can click later — non-blocking.
- (Future: super-admin across orgs. Not modeled yet.)

## Glossary

- **Organization** — a CDL. Mirrors a Clerk organization
  (`clerk_organization_id`). Owns merchants and campaigns.
- **Merchant** — a store inside the CDL.
- **Campaign** — STI base. Two subclasses:
  - **`OrganizationCampaign`** — org-wide, spans many merchants
    (e.g. Pasaporte de Compras). Time-bounded. Has an `entry_policy`:
    - `cumulative` — entries are unlocked at stamp-count thresholds
      (e.g. 6 distinct merchants → +1 entry, 12 → +1 entry…). Pasaporte
      is cumulative.
    - `simple` — every confirmed stamp = 1 raffle entry, optionally
      capped per day via `day_cap` (e.g. `day_cap: 1` means at most one
      entry per customer per day, regardless of how many times they
      scan).
  - **`LoyaltyCampaign`** — merchant-scoped, always-on
    (e.g. Cartão Fidelidade). Single merchant via denormalized
    `campaigns.merchant_id`. Visits-as-currency, merchant-initiated
    redemption.
- **Prize** — an awardable item on a campaign. `(name, threshold?, position)`.
  Threshold meaning depends on the campaign type:
  - **LoyaltyCampaign** — `threshold` = visits required to redeem this
    prize. Required.
  - **OrganizationCampaign** + `cumulative` — `threshold` = stamps
    required to be entered in the raffle for **this specific prize**.
    Each prize is its own raffle pool. Required, > 0.
  - **OrganizationCampaign** + `simple` — `threshold` ignored. All
    prizes share one entry pool; one winner is drawn per prize at end
    of campaign.
  - All campaigns require ≥1 Prize before activation.
- **Visit** — physical scan event. One per scan.
- **Stamp** — visit's credit toward a campaign. One row per (visit,
  active campaign at the merchant). `status: pending | confirmed`.
  When pending, the row also carries the 6-digit `code` and `expires_at`.
  All pending stamps generated from a single visit **share the same
  code**, so the customer shows one code and the merchant types one code
  to confirm them all at once.
- **Redemption** — customer claimed a prize.
  - LoyaltyCampaign: merchant-initiated, deducts from balance.
  - OrganizationCampaign: automatic on completion (raffle entry / single
    prize claim) — flow specifics TBD per campaign type.

## Cross-cutting decisions (locked)

These apply across all flows; do not relitigate.

- **Customer is not a Clerk user.** Separate `customers` table; phone +
  WhatsApp + LGPD captured at first scan; phone unique (E.164 normalized);
  90-day signed-cookie session.
- **Verification is async and non-blocking.** On first-time identification,
  the server creates the Customer row, sets the cookie, and enqueues a
  WhatsApp message with a signed verification link. The customer is fully
  functional immediately. Clicking the link later sets `verified_at`. No
  features gated on verification for v1.
- **Slugs everywhere.** `organizations.slug`, `merchants.slug`,
  `campaigns.slug` — unique not-null. URLs use slugs.
- **Frictionless scan is the default; per-campaign `requires_validation`
  flag.** Default `false`. When `true`, the Stamp is created with
  `status: pending` and a 6-digit `code`; the merchant must type the
  code to flip the Stamp(s) to `confirmed`. No separate pending-check-in
  table — the code lives on the Stamp.
- **Redemption is merchant-initiated for LoyaltyCampaign.** Customer never
  asks for prizes from their device.
- **STI Campaign with denormalized `merchant_id`.**
  - `LoyaltyCampaign` has `merchant_id` set, no `campaign_merchants` rows.
  - `OrganizationCampaign` has `merchant_id` null, 1..* `campaign_merchants` rows.
- **Stamp uniqueness** is `(visit_id, campaign_id)` — one stamp per visit
  per campaign. Customer progress depends on the campaign type:
  - LoyaltyCampaign balance = `count(stamps confirmed) - sum(redemptions.threshold_snapshot)`.
  - OrganizationCampaign cumulative — for each Prize, the customer is in
    its raffle pool iff `count(distinct merchant_id of confirmed stamps) ≥ prize.threshold`.
  - OrganizationCampaign simple — entries in the shared pool = total
    confirmed stamps for the customer, capped per day at `day_cap` if
    set. One winner drawn per Prize at end of campaign.
- **All campaigns require ≥1 Prize before activation.** Empty prize list
  blocks the activate transition.
- **Mid-campaign mutations.** Once `status = active`, merchants can be
  added to an OrganizationCampaign but not removed. To "remove," end the
  campaign.
- **Conventions** live in [`../CLAUDE.md`](../CLAUDE.md): snake_case ↔
  camelCase via `inertia-caseshift`, nested resources mirror in the
  controller module, page-rendering controllers inherit from
  `InertiaController`, page metadata via `PageMetadata` concern, sidebar
  shell via `<AppLayout>`.

---

## Admin flows (Organization user)

### A1. Admin dashboard

**Trigger**: Org user signs in.
**End state**: high-level health visible — total merchants, active
campaigns, recent customer activity across the org.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☰  CDL Jaguarão                                                      │
│ ─────────────────────────────────────────────────────────────────────│
│ Início                                                               │
│                                                                      │
│ # Painel                                                             │
│                                                                      │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│ │ Merchants    │  │ Campanhas    │  │ Clientes     │  │ Visitas    │ │
│ │     12       │  │   ativas 2   │  │    347       │  │  hoje 24   │ │
│ └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                      │
│ Atividade recente                                                    │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Maria Silva — visitou Calzados Ricardo · Pasaporte 3/6 · 15:42   │ │
│ │ João Pereira — visitou Moda Río Branco · Cartão 4/10 · 15:31     │ │
│ │ ...                                                              │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### A2. Manage Merchants

#### A2.1 List merchants

**Trigger**: Sidebar → Merchants.
**End state**: All merchants in the org are visible with quick actions.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Início › Lojistas                                  [ + Novo lojista ]│
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Calzados Ricardo            12 visitas (semana)   [Show] [Edit] │ │
│ │ Moda Río Branco              7 visitas (semana)   [Show] [Edit] │ │
│ │ Café Central                 3 visitas (semana)   [Show] [Edit] │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

#### A2.2 Create merchant

**Trigger**: "+ Novo lojista".
**End state**: New `Merchant` exists in the org; slug auto-generated;
empty member list.

```
┌──────────────────────────────────────────────────────────────────────┐
│ # Novo lojista                                                       │
│   Nome   [ Calzados Ricardo ]                                        │
│   Slug   [ calzados-ricardo ]  (gerado automaticamente, editável)    │
│                                                                      │
│         [ Cancelar ]   [ Criar ]                                     │
└──────────────────────────────────────────────────────────────────────┘
```

#### A2.3 Show merchant

**Trigger**: Click merchant row or "Show".
**End state**: Merchant detail visible — basic info, member list, current
loyalty campaign (if any), participating org-campaigns, recent visits.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Lojistas › Calzados Ricardo                            [Edit] [⋯]    │
│                                                                      │
│ # Calzados Ricardo                                                   │
│ /s/calzados-ricardo                                                  │
│                                                                      │
│ ── Lojistas (usuários)                          [ + Convidar ]       │
│  • Pedro Fernandes  · pedro@…  · convite aceito                      │
│  • Ana Souza        · ana@…    · convite enviado · há 2d             │
│                                                                      │
│ ── Cartão Fidelidade            [ Configurar / desativar ]           │
│  Programa ativo · 3 prêmios · 18 clientes ativos                     │
│                                                                      │
│ ── Campanhas (organização) participando                              │
│  • Pasaporte de Compras 2026   · ativa                               │
│                                                                      │
│ ── Visitas recentes                                                  │
│  Maria Silva · 15:42                                                 │
│  ...                                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

#### A2.4 Edit merchant

**Trigger**: "Edit" on a merchant.
**End state**: Updated `Merchant` (name, slug). Slug change is logged but
does not retroactively change historical visit URLs (URLs use slugs but
old QRs already printed remain valid because the merchant_id is also
encoded — TBD per impl plan).

#### A2.5 Remove merchant

**Trigger**: Show merchant → "⋯" → "Remover".
**End state**: Merchant deleted (soft or hard — TBD). Loyalty campaign
deleted; merchant unlinked from any active OrganizationCampaign;
historical visits/stamps preserved.

#### A2.6 Manage merchant users (invitations)

**Trigger**: Show merchant → "+ Convidar".
**End state**: Clerk invitation sent to email with `merchant_id` in
`public_metadata`. On accept, the invitee becomes a Merchant user tied
to this merchant on first sign-in.

```
┌────────────────────────────────────┐
│ Convidar usuário                   │
│   Email  [ ana@example.com ]       │
│         [ Cancelar ]   [ Enviar ]  │
└────────────────────────────────────┘
```

(Already implemented under
`Organizations::Merchants::InvitationsController`; reused.)

### A3. Manage Campaigns

(Org user manages **OrganizationCampaigns** here; LoyaltyCampaigns are
managed per-merchant from the merchant detail page.)

#### A3.1 List campaigns

**Trigger**: Sidebar → Campanhas.
**End state**: All OrganizationCampaigns visible, filterable by status.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Início › Campanhas                                  [ + Nova ]       │
│                                                                      │
│ Filtros: [ todas ] [ rascunho ] [ ativa ] [ encerrada ]              │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Pasaporte de Compras 2026                                        │ │
│ │ ATIVA · 6 lojistas · 347 stamps · 12 completadas · até 31/12     │ │
│ ├──────────────────────────────────────────────────────────────────┤ │
│ │ Black Friday 2025                                                │ │
│ │ ENCERRADA · 8 lojistas · 1.284 stamps · 82 completadas           │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

#### A3.2 Create OrganizationCampaign

**Trigger**: "+ Nova".
**End state**: Draft `OrganizationCampaign` exists with `entry_policy`,
prizes, and enrolled merchants. Status `draft` until activated.
Activation is blocked until ≥1 prize and (for cumulative) ≥1
entry threshold are set.

```
┌──────────────────────────────────────────────────────────────────────┐
│ # Nova campanha                                                      │
│                                                                      │
│ Nome              [ Pasaporte de Compras 2026 ]                      │
│ Slug              [ pasaporte-2026 ]                                 │
│                                                                      │
│ Janela            [ 2026-04-01 ]  até  [ 2026-12-31 ]                │
│                                                                      │
│ Tipo de campanha                                                     │
│  ◉ Acumulativa — cada prêmio tem seu próprio marco de stamps         │
│      (cliente entra no sorteio do prêmio ao atingir o marco)         │
│  ◯ Simples — cada visita registrada vale 1 entrada                   │
│                                                                      │
│ ☐ Exigir validação do lojista a cada check-in                        │
│   (deixe desmarcado para captura sem fricção)                        │
│                                                                      │
│ Prêmios   (mínimo 1; cada prêmio sorteado entre os elegíveis)        │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │  Stamps  Nome                                                    │ │
│ │  [  6 ]  [ iPhone 15            ]      [Remover]                 │ │
│ │  [ 12 ]  [ Smart TV 55"         ]      [Remover]                 │ │
│ │  [ 18 ]  [ Vale-compras R$ 500  ]      [Remover]                 │ │
│ │  + Adicionar prêmio                                              │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Lojistas participantes                                               │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Calzados Ricardo                                               │ │
│ │ ☑ Moda Río Branco                                                │ │
│ │ ☐ Café Central                                                   │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│             [ Cancelar ]   [ Salvar como rascunho ]                  │
└──────────────────────────────────────────────────────────────────────┘
```

When **Simples** is chosen, the prize rows hide the `Stamps` column and
a `day_cap` field appears above:

```
Limite de entradas por dia (por cliente)
   ◯ Sem limite
   ◉ [ 1 ] entrada(s) por dia

Prêmios   (mínimo 1; sorteados ao final)
 ┌────────────────────────────────────────────────────┐
 │  [ iPhone 15            ]      [Remover]           │
 │  [ Smart TV 55"         ]      [Remover]           │
 │  [ Vale-compras R$ 500  ]      [Remover]           │
 │  + Adicionar prêmio                                │
 └────────────────────────────────────────────────────┘
```

The Lojistas block is identical for both policies.

#### A3.3 Show campaign

**Trigger**: Click campaign row.
**End state**: Detail visible — info, status pill, enrolled merchants,
prize ladder, completion count, recent stamp activity.

#### A3.4 Edit campaign

**Trigger**: "Edit" on Show.
**End state**: Updated campaign. While `status = draft`, all fields are
editable. While `active`, fields are restricted (no removing merchants,
no changing dates/prizes after at least one stamp issued).

#### A3.5 Disable / End campaign

**Trigger**: "Encerrar" on Show.
**End state**: `status = ended`. No new stamps can be issued. Existing
stamps and redemptions preserved.

#### A3.6 Manage campaign merchants

**Trigger**: Edit campaign → merchant multi-select.
**End state**: `campaign_merchants` rows reconciled with the selection.
Adds always allowed; removes only allowed while `status = draft`.

---

## Merchant flows

### M1. Merchant dashboard

**Trigger**: Merchant user signs in.
**End state**: Today/week visit counts, pending validations, recent
activity, shortcuts to manage loyalty / validate / redeem.

```
┌──────────────────────────────────────────────────────────────────────┐
│ ☰  Calzados Ricardo                                                  │
│ ─────────────────────────────────────────────────────────────────────│
│ # Painel                                                             │
│                                                                      │
│ ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐          │
│ │ Hoje         │  │ Esta semana  │  │ Validações pendentes│          │
│ │     7        │  │     23       │  │       2             │          │
│ └──────────────┘  └──────────────┘  └─────────────────────┘          │
│                                                                      │
│ Ações rápidas                                                        │
│  [ Validar código ]   [ Resgatar prêmio ]                            │
│                                                                      │
│ Atividade recente                                                    │
│   Maria Silva · Pasaporte 3/6 · 15:42                                │
│   João Pereira · Cartão 4/10 · 15:31                                 │
│   ...                                                                │
└──────────────────────────────────────────────────────────────────────┘
```

### M2. Manage loyalty campaign

**Trigger**: Sidebar → Cartão Fidelidade (or merchant-detail link from
Org admin's surface).
**End state**: `LoyaltyCampaign` for this merchant exists, configured,
and is `active` or `ended`. Has 0..N prizes.

```
┌──────────────────────────────────────────────────────────────────────┐
│ # Cartão Fidelidade                                                  │
│                                                                      │
│  Programa ativo  [ ●─── ON  ]                                        │
│                                                                      │
│  Prêmios                                                             │
│   5 visitas    Café grátis            [Editar] [Remover]             │
│  10 visitas    Camiseta               [Editar] [Remover]             │
│  20 visitas    Jantar para 2          [Editar] [Remover]             │
│  + Adicionar prêmio                                                  │
│                                                                      │
│  ─────────────────────────────────                                   │
│  [ Desativar… ]                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Disable confirmation:

```
┌────────────────────────────────────────────────┐
│ Desativar Cartão Fidelidade?                   │
│                                                │
│ ◯ Manter saldos atuais                         │
│   Reativando depois, clientes continuam de     │
│   onde pararam.                                │
│                                                │
│ ◯ Zerar saldos                                 │
│   Saldos voltam a zero a partir de agora.      │
│   Histórico fica preservado mas não conta.     │
│                                                │
│        [ Cancelar ]   [ Desativar ]            │
└────────────────────────────────────────────────┘
```

### M3. List participating OrganizationCampaigns

**Trigger**: Sidebar → Campanhas (merchant view).
**End state**: Read-only list of OrganizationCampaigns this merchant is
enrolled in. No opt-out for v1.

```
┌──────────────────────────────────────────────────────────────────────┐
│ # Campanhas                                                          │
│                                                                      │
│   Pasaporte de Compras 2026                                          │
│   ATIVA · 23 stamps emitidos por mim · até 31/12                     │
│                                                                      │
│   Black Friday 2025                                                  │
│   ENCERRADA · 47 stamps emitidos por mim                             │
└──────────────────────────────────────────────────────────────────────┘
```

### M4. Confirm visit code

**Trigger**: Sidebar → Validar código (or "Validar código" CTA on
dashboard). Only relevant when ≥1 active campaign at this merchant has
`requires_validation = true`.
**End state**: All `Stamp(status: pending)` rows linked to the consumed
`PendingCheckIn` flip to `confirmed`. Customer + per-campaign progress
shown.

```
┌─────────────────────────────────┐
│ # Validar código                │
│                                 │
│ Digite o código de 6 dígitos:   │
│  ┌───┬───┬───┬───┬───┬───┐      │
│  │ _ │ _ │ _ │ _ │ _ │ _ │      │
│  └───┴───┴───┴───┴───┴───┘      │
│         [ Validar ]             │
└─────────────────────────────────┘
```

Success:

```
┌─────────────────────────────────┐
│ ✔ Validação aprovada            │
│ Cliente: Maria Silva            │
│   ✔ Compre e Ganhe — 1/3        │
│   (Pasaporte já estava em 3/6)  │
│           [ Validar próximo ]   │
└─────────────────────────────────┘
```

### M5. Redeem reward (LoyaltyCampaign)

**Trigger**: Sidebar → Resgatar prêmio (or CTA from dashboard).
**End state**: `Redemption` row inserted; balance decremented;
`merchant_user_id` set to the actor.

```
┌─────────────────────────────────────┐
│ # Resgatar prêmio                   │
│                                     │
│ WhatsApp da cliente:                │
│  [ +598 ___ ___ ____ ]              │
│         [ Buscar ]                  │
└─────────────────────────────────────┘
```

After lookup:

```
┌──────────────────────────────────────────────────────────┐
│ Cliente: Maria Silva (+598 99 1234 5678)                 │
│ Saldo atual: 12 visitas                                  │
│                                                          │
│ Selecione o prêmio:                                      │
│  ◯ Café grátis              5 visitas    DISPONÍVEL      │
│  ◯ Camiseta                10 visitas    DISPONÍVEL      │
│  ◯ Jantar para 2           20 visitas    Falta 8         │
│                                                          │
│           [ Cancelar ]   [ Confirmar resgate ]           │
└──────────────────────────────────────────────────────────┘
```

---

## Customer flows

### C1. First-time identification

**Trigger**: Customer scans `/s/:merchant_slug`; no `customer_session`
cookie present.
**End state**: `Customer` row created (unverified); cookie set; WhatsApp
verification message **enqueued** (delivered async; non-blocking); the
flow proceeds to C3 (visit/scan registration).

```
┌─────────────────────────────────┐
│ ╳ CDL Jaguarão                  │
│                                 │
│ Calzados Ricardo                │
│ Bem-vinda! 🇺🇾                   │
│                                 │
│ Hoje você está participando de: │
│   • Pasaporte de Compras        │
│   • Cartão Fidelidade Ricardo   │
│                                 │
│  Seu WhatsApp                   │
│  [ +598 ___ ___ ____ ]          │
│                                 │
│  ☐ Aceito a política de         │
│    privacidade (LGPD)           │
│                                 │
│       [ Participar ]            │
└─────────────────────────────────┘
```

After submit, the customer is forwarded to C3. The verification message
arrives on their phone in the background:

```
WhatsApp from "CDL Jaguarão Bot":
  Olá! Para confirmar o seu cadastro no CDL Jaguarão e
  garantir comunicações futuras, toque aqui:
  https://app.fielize.com/c/verify/<signed-token>

  Se você já está usando o app, não precisa fazer nada.
  Esta verificação serve para confirmar que o número é seu.
```

### C2. Verify account via WhatsApp link

**Trigger**: Customer taps the verification link in WhatsApp.
**End state**: `customers.verified_at` set. Page acknowledges and
redirects to last-visited merchant page (or a generic landing).

```
┌─────────────────────────────────┐
│ ✔ WhatsApp confirmado!          │
│                                 │
│ Você está pronta para receber   │
│ atualizações sobre as campanhas │
│ que você participa.             │
│                                 │
│        [ Voltar à loja ]        │
└─────────────────────────────────┘
```

(No flows are gated on verification for v1. The flag is for data hygiene
and future use.)

### C3. Merchant page — see active campaigns + register a visit

**Trigger**: Customer scans `/s/:merchant_slug` (cookie present, OR just
completed C1).
**End state**: A `Visit` row exists; one `Stamp` row per active campaign
at the merchant (`confirmed` for non-validated, `pending` for validated);
optional `PendingCheckIn` if any pending stamps exist; `LoyaltyCampaign`
visit credit (effectively another stamp on the loyalty campaign,
confirmed).

Frictionless result (no validated campaign in the mix):

```
┌─────────────────────────────────┐
│  ✔ Bem-vinda!                   │
│                                 │
│  Calzados Ricardo               │
│                                 │
│  Pasaporte de Compras           │
│  ▣ ▣ ▣ □ □ □     3 / 6          │
│                                 │
│  Cartão Fidelidade Ricardo      │
│  Saldo: 4 visitas               │
│   ✓ Café grátis     5 visitas   │
│   ◌ Camiseta       10 visitas   │
│                                 │
│  Para resgatar prêmios, peça    │
│  à atendente.                   │
└─────────────────────────────────┘
```

Validated campaign in the mix → code shown alongside frictionless
progress:

```
┌─────────────────────────────────┐
│  Calzados Ricardo               │
│                                 │
│  Mostre este código:            │
│   ┌───┬───┬───┬───┬───┬───┐     │
│   │ 7 │ 8 │ 3 │ 1 │ 4 │ 9 │     │
│   └───┴───┴───┴───┴───┴───┘     │
│  Expira em 09:42                │
│                                 │
│  Já registrado:                 │
│    ✔ Pasaporte 3/6              │
│    ✔ Cartão 5 visitas           │
│  Aguardando lojista:            │
│    ⏳ Compre e Ganhe             │
└─────────────────────────────────┘
```

(Re-scanning produces a new Visit and any new pending codes; existing
stamps for the same `(campaign, merchant, customer)` triple — for
OrganizationCampaign — do NOT duplicate at the campaign-progress level
but the Stamp row is created for completeness and audit.)

---

## Surfaces and routes (summary)

These are paths where each surface lives, for orientation. Full route
table in `02-impl-*.md`.

```
Admin (Organization user)              Merchant user                Customer (no auth)
─────────────────────────────          ──────────────────────       ────────────────────
/                       dashboard      /                home        /s/:merchant_slug   show / scan
/organizations/merchants               /merchants/loyalty_program   /c/verify/:token    verify
/organizations/merchants/:id           /merchants/campaigns
/organizations/merchants/:id/edit      /merchants/validations/new
/organizations/merchants/:id/invitations  /merchants/redemptions/new
/organizations/campaigns
/organizations/campaigns/:id
/organizations/campaigns/:id/edit
```

---

## Phasing (placeholder)

After overview + data model are agreed, three implementation plans get
spawned in parallel:

- `02-impl-admin.md` — flows A1 through A3.6.
- `03-impl-merchant.md` — flows M1 through M5.
- `04-impl-customer.md` — flows C1 through C3.

The shipping order across these will be decided after the impl plans are
written; the strong hint is "anything Pasaporte-pilot-blocking first."

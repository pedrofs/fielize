# WhatsApp Templates — Fielize v0

> Templates registered with Meta for transactional messaging. Free-form messages are only allowed within the 24-hour customer-initiated window — outside of that, only approved templates fire.

**Provider candidates:** Z-API or 360dialog (both BR-friendly).
**Cost in Brazil (approximate):** R$0.05–0.15 per message, varies by Meta category.
**Approval lead time:** 1–24 hours per template. Apply on day 1 of the build.

---

## Catalog

### 1. `cdl_optin_confirmation`

**Category:** utility
**Triggered:** customer submits phone form on `C-00 Store Landing` (Journey 1, step 3).
**Placeholders:** `{{nome}}`, `{{cdl_nome}}`, `{{magic_link}}`

> ¡Hola **{{nome}}**! 👋 Pra confirmar tu participación en las campañas de la **{{cdl_nome}}**, tocá el link: {{magic_link}}. Expira en 30 minutos.

PT-BR variant for resident campaigns:

> Olá **{{nome}}**! 👋 Para confirmar sua participação nas campanhas da **{{cdl_nome}}**, toque no link: {{magic_link}}. Expira em 30 minutos.

---

### 2. `cdl_visit_confirmation`

**Category:** marketing (requires separate marketing opt-in)
**Triggered:** optional, configurable per CDL. Default: off.
**Placeholders:** `{{loja}}`, `{{progresso}}`

> +1 selo en **{{loja}}**. Tu pasaporte: **{{progresso}}**. ¡Faltan pocas tiendas!

Use sparingly — risks template fatigue and customer block.

---

### 3. `cdl_passport_completed`

**Category:** utility
**Triggered:** participation reaches threshold (e.g., 6/6 stamps) on a Passport campaign (Journey 2, step 2).
**Placeholders:** `{{nome}}`, `{{data_sorteio}}`

> ¡**{{nome}}**, completaste tu pasaporte! 🎉 Estás participando del sorteo. Resultado el **{{data_sorteio}}**.

---

### 4. `cdl_redemption_code`

**Category:** utility
**Triggered:** customer taps "Redeem" on Cartão Fidelidade reward (Journey 3, step 2).
**Placeholders:** `{{nome}}`, `{{prêmio}}`, `{{código}}`, `{{loja}}`

> ¡**{{nome}}**, ganhaste! 🎁 Tu prêmio: **{{prêmio}}**. Código: **{{código}}**. Apresentá-lo en **{{loja}}** cuando quieras — sin prazo.

The code is duplicated on screen `C-05` so the customer has two copies.

---

### 5. `cdl_redemption_done`

**Category:** utility
**Triggered:** merchant validates the redemption code via `M-06` (Journey 3, step 4).
**Placeholders:** `{{nome}}`, `{{loja}}`, `{{excedente}}`

> **{{nome}}**, tu resgate foi concluído em **{{loja}}**. ✓ Tu novo cartão fidelidade já começa com **{{excedente}}/10** (excedente preservado).

---

### 6. `cdl_winner_notification`

**Category:** utility
**Triggered:** CDL admin runs auto-draw at campaign end (`A-05`).
**Placeholders:** `{{nome}}`, `{{prêmio}}`, `{{instruções}}`

> ¡**{{nome}}**, ganhaste el sorteo! 🎉 Premio: **{{prêmio}}**. Para retirarlo: {{instruções}}. ¡Felicitaciones!

---

## Implementation notes

- All sends are logged to the `whatsapp_messages` table for audit and cost tracking.
- Webhook validates Meta/provider signature on every request.
- 24-hour window opens when a user replies — within it, free-form messages are allowed (rare in our flows).
- Magic link tokens (used by template 1) are JWTs signed with the platform secret. Verified server-side.
- For utility-category templates, customers do not need to opt in beyond the platform-level LGPD acceptance on `C-00`. For marketing-category (template 2), separate opt-in is required.

---

## Delivery & retry policy

- On first delivery failure, retry once after 60 seconds.
- On second failure, fall back to SMS (if SMS provider configured).
- After 3 failures, mark message as `failed` and surface in admin dashboard.

---

## Future templates (post-v0)

- `cdl_campaign_reminder` (marketing) — "Faltan 3 días para que termine la campaña."
- `cdl_new_campaign_announcement` (marketing) — "{{cdl_nome}} lanzó una nueva campaña."
- `cdl_runner_up_thanks` (utility) — "Obrigado por participar! Próxima campanha em…"
- `cdl_cross_cdl_invitation` (marketing, cross-tenant) — "Você participou em Jaguarão. Conheça campanhas em Pelotas."

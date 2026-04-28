# Fielize

Multi-tenant campaign-management platform for Brazilian merchant associations (CDLs). Launch customer: CDL Jaguarão / RS.

## What it does

Replaces manual paper-based merchant association campaigns (passport stamps, raffles, loyalty cards) with a digital platform. Each CDL gets a white-labeled instance. Each merchant gets one QR code at their counter that serves all active campaigns simultaneously. Customers scan, identify once via WhatsApp, and are auto-enrolled in everything they're eligible for.

## Repository layout

```
painel_vizin/
├── AGENTS.md              ← read this first
├── docs/
│   ├── wireframes.html    ← visual source of truth
│   ├── ux-design.md
│   ├── data-model.md
│   ├── whatsapp-templates.md
│   └── product/
│       ├── vision.md
│       ├── cdl-context.md
│       └── decisions-log.md
└── (source code — to be scaffolded)
```

## Stack

Next.js 15 (App Router) · Supabase (Postgres + Auth + RLS) · Vercel · WhatsApp Business API (Z-API or 360dialog) · Tailwind CSS · TypeScript.

## Status

Pre-implementation. Wireframes and design docs complete. Initial PR will scaffold Next.js + Supabase project and implement Slice 1 (tenant subdomain + theming).

## License

Proprietary. All rights reserved.

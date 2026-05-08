import { Head, usePage } from "@inertiajs/react"
import type { CSSProperties, ReactNode } from "react"

import { InstallBanner } from "@/components/install-banner"

type OrgBranding = {
  primaryColor?: string | null
  secondaryColor?: string | null
}

type LayoutPageProps = {
  organization?: OrgBranding
}

const DEFAULT_THEME_COLOR = "#0f172a"

function isHex(color: unknown): color is string {
  return typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)
}

function pickForeground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  const l = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return l > 0.5 ? "#000000" : "#ffffff"
}

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { props } = usePage()
  const title = props.title
  const branding = (props as LayoutPageProps).organization
  const primary = isHex(branding?.primaryColor) ? branding.primaryColor : null
  const secondary = isHex(branding?.secondaryColor)
    ? branding.secondaryColor
    : null

  const themeVars: Record<string, string> = {}
  if (primary) {
    themeVars["--primary"] = primary
    themeVars["--primary-foreground"] = pickForeground(primary)
  }
  if (secondary) {
    themeVars["--accent"] = secondary
    themeVars["--accent-foreground"] = pickForeground(secondary)
  }

  const themeColor = primary ?? DEFAULT_THEME_COLOR

  return (
    <>
      <Head title={title ?? undefined}>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content={themeColor} />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <div
        className="min-h-screen bg-background text-foreground"
        style={themeVars as CSSProperties}
        data-testid="customer-layout"
      >
        <div className="mx-auto flex min-h-screen max-w-screen-sm flex-col px-4 pb-8">
          {children}
        </div>
        <InstallBanner />
      </div>
    </>
  )
}

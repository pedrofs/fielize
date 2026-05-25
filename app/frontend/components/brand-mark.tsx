import { cn } from "@/lib/utils"

/**
 * The Fielize "selo" — a postage-stamp roundel: a gold disc with a perforated
 * (dashed) edge and the "F" set in the display face. The stamp is the product's
 * hero object, so it doubles as the brand mark. Gold + its dark-brown foreground
 * are Fielize constants and are never overridden by an organization's theme.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full">
        <circle cx="20" cy="20" r="18.5" fill="var(--reward)" />
        <circle
          cx="20"
          cy="20"
          r="16.5"
          fill="none"
          stroke="var(--reward-foreground)"
          strokeWidth="1.4"
          strokeDasharray="0.5 3.35"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
      <span
        className="relative font-heading text-[0.62em] font-bold leading-none"
        style={{ color: "var(--reward-foreground)" }}
      >
        F
      </span>
    </span>
  )
}

/** Wordmark: "fielize" in the display face with the dot of the "i" as a gold stamp dot. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading text-base font-semibold tracking-tight", className)}>
      <span className="sr-only">Fielize</span>
      <span aria-hidden className="inline-flex items-baseline">
        f
        <span className="relative inline-block">
          {/* dotless i (U+0131) so the gold stamp dot is the only dot */}
          ı
          <span className="absolute left-1/2 top-[0.12em] size-[0.18em] -translate-x-1/2 rounded-full bg-reward" />
        </span>
        elize
      </span>
    </span>
  )
}

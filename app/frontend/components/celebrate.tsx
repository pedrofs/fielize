import type { ReactNode } from "react"
import { CheckIcon } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

/**
 * Shared celebration primitives for Fielize's reward moments — the stamp "thunk"
 * and the raffle reveal. Motion here is the product, not decoration: it pays off a
 * real domain event (a confirmed stamp, a drawn winner). Everything degrades to an
 * instant, static state under `prefers-reduced-motion`.
 */

const CONFETTI_COLORS = ["var(--reward)", "var(--celebration)", "var(--primary)"]

/** A one-shot confetti burst that fills its (relative, positioned) parent. */
export function Confetti({ count = 18, className }: { count?: number; className?: string }) {
  const reduced = useReducedMotion()
  if (reduced) return null

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-10 overflow-hidden", className)}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => {
        const dx = (Math.random() - 0.5) * 260
        const rise = -50 - Math.random() * 150
        const size = 6 + Math.random() * 7
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 block rounded-[2px]"
            style={{ width: size, height: size, backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{
              x: dx,
              y: [0, rise, rise + 240],
              opacity: [1, 1, 0],
              rotate: (Math.random() - 0.5) * 540,
              scale: [1, 1, 0.7],
            }}
            transition={{ duration: 1.3 + Math.random() * 0.6, delay: Math.random() * 0.1, ease: "easeOut" }}
          />
        )
      })}
    </div>
  )
}

/** The signature "thunk": a gold, perforated selo lands with a spring + impact ring. */
export function StampThunk({ className }: { className?: string }) {
  const reduced = useReducedMotion()

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      aria-hidden
    >
      {!reduced && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: "var(--reward)" }}
          initial={{ scale: 0.65, opacity: 0.55 }}
          animate={{ scale: 2.3, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.12 }}
        />
      )}
      <motion.span
        className="relative flex size-full items-center justify-center rounded-full border-2 border-dashed"
        style={{
          backgroundColor: "var(--reward)",
          borderColor: "var(--reward-foreground)",
          color: "var(--reward-foreground)",
        }}
        initial={reduced ? false : { scale: 1.85, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: -8, opacity: 1 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 600, damping: 17, mass: 0.8 }}
      >
        <CheckIcon className="size-1/2" strokeWidth={3} />
      </motion.span>
    </div>
  )
}

/** A press-scale wrapper for primary CTAs — cheap tactile feedback. */
export function Pressable({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={cn(className)}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 700, damping: 30 }}
    >
      {children}
    </motion.div>
  )
}

import { usePage } from "@inertiajs/react"
import { useEffect } from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"

/**
 * Bridges the shared Inertia flash to sonner toasts and mounts the
 * <Toaster/>. Rendered once per layout — AppLayout for organization-side
 * pages, CustomerLayout for customer-facing pages — so every page surfaces
 * the `notice:`/`alert:` a controller sets (e.g. "Campanha criada.",
 * "Inscrição confirmada!") from a single implementation.
 *
 * Toasts are dispatched with stable ids so React strict-mode's double
 * effect invocation (dev) shows a single toast rather than two.
 *
 * `closeButton` gives an explicit dismiss control and sonner pauses the
 * 5s auto-dismiss timer on hover/focus, satisfying WCAG 2.2.1.
 */
export function FlashToaster() {
  const flash = usePage().flash

  useEffect(() => {
    if (flash?.notice) toast.success(flash.notice, { id: "flash-notice" })
  }, [flash?.notice])

  useEffect(() => {
    if (flash?.alert) toast.error(flash.alert, { id: "flash-alert" })
  }, [flash?.alert])

  return (
    <Toaster position="top-center" richColors closeButton duration={5000} />
  )
}

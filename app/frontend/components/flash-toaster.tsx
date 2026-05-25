import { usePage } from "@inertiajs/react"
import { useEffect } from "react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"

/**
 * Bridges the shared Inertia flash to sonner toasts and mounts the
 * <Toaster/>. Rendered once in AppLayout so every organization-side page
 * surfaces the `notice:`/`alert:` a controller sets (e.g. "Campanha
 * criada.", "Campanha ativada.") — previously these were never shown.
 *
 * Toasts are dispatched with stable ids so React strict-mode's double
 * effect invocation (dev) shows a single toast rather than two.
 */
export function FlashToaster() {
  const flash = usePage().flash

  useEffect(() => {
    if (flash?.notice) toast.success(flash.notice, { id: "flash-notice" })
  }, [flash?.notice])

  useEffect(() => {
    if (flash?.alert) toast.error(flash.alert, { id: "flash-alert" })
  }, [flash?.alert])

  return <Toaster position="top-center" richColors />
}

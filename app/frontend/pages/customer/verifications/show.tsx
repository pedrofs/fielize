import type { ReactNode } from "react"
import { Link } from "@inertiajs/react"
import { CircleCheckIcon } from "lucide-react"

import { CustomerLayout } from "@/layouts/customer-layout"
import { Button } from "@/components/ui/button"

export default function CustomerVerificationShow() {
  return (
    <article
      className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center"
      data-testid="verification-confirmed"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
        <CircleCheckIcon className="size-8" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        WhatsApp confirmado!
      </h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Pronto. Seu número está confirmado e você está participando das
        campanhas que se inscreveu.
      </p>
      <Button asChild className="mt-4">
        <Link href="/" data-testid="verification-continue">
          Continuar
        </Link>
      </Button>
    </article>
  )
}

CustomerVerificationShow.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)

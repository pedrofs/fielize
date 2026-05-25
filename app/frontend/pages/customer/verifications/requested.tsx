import type { ReactNode } from "react"
import { MessageCircleIcon } from "lucide-react"

import { CustomerLayout } from "@/layouts/customer-layout"

export default function CustomerVerificationRequested() {
  return (
    <article
      className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center"
      data-testid="verification-requested"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
        <MessageCircleIcon className="size-8" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Novo link a caminho
      </h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Acabamos de enviar um novo link de confirmação para o seu
        WhatsApp. Confira sua conversa com a Fielize.
      </p>
    </article>
  )
}

CustomerVerificationRequested.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)

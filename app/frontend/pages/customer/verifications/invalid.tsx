import type { ReactNode } from "react"

import { CustomerLayout } from "@/layouts/customer-layout"

export default function CustomerVerificationInvalid() {
  return (
    <article
      className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center"
      data-testid="verification-invalid"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-3xl">
        ⚠️
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Link inválido
      </h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Este link não está mais válido. Se você ainda precisa confirmar
        seu WhatsApp, abra a campanha em que se inscreveu e refaça a
        inscrição para receber uma nova mensagem.
      </p>
    </article>
  )
}

CustomerVerificationInvalid.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)

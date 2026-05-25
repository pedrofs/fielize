import { useForm } from "@inertiajs/react"
import type { FormEvent, ReactNode } from "react"
import { HourglassIcon } from "lucide-react"

import { CustomerLayout } from "@/layouts/customer-layout"
import { Button } from "@/components/ui/button"

type Props = {
  token: string
}

export default function CustomerVerificationExpired({ token }: Props) {
  const { post, processing } = useForm({
    verificationRequest: { token },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    post("/verification_requests")
  }

  return (
    <article
      className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center"
      data-testid="verification-expired"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-warning/15 text-warning">
        <HourglassIcon className="size-8" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Este link expirou
      </h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Por segurança, os links de confirmação valem por alguns dias.
        Podemos enviar um novo agora mesmo.
      </p>
      <form onSubmit={submit} className="mt-2 w-full max-w-xs">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={processing}
          data-testid="verification-resend"
        >
          Enviar um novo link
        </Button>
      </form>
    </article>
  )
}

CustomerVerificationExpired.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)

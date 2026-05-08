import type { ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { MerchantForm } from "./_form"

type Props = {
  merchant: {
    name: string
    address: string | null
    latitude: number | null
    longitude: number | null
  }
}

export default function NewMerchant({ merchant }: Props) {
  return (
    <MerchantForm
      initial={merchant}
      submit={(form) => form.post("/organizations/merchants")}
      submitLabel="Criar lojista"
    />
  )
}

NewMerchant.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>

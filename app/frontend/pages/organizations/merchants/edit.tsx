import type { ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { MerchantForm } from "./_form"

type Merchant = {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  organizationId: string
}

type Props = {
  merchant: Merchant
}

export default function EditMerchant({ merchant }: Props) {
  return (
    <MerchantForm
      initial={merchant}
      submit={(form) => form.patch(`/organizations/merchants/${merchant.id}`)}
      submitLabel="Salvar alterações"
    />
  )
}

EditMerchant.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>

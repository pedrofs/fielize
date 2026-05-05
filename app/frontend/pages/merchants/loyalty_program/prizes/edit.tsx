import type { ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { PrizeForm } from "./_form"
import type { LoyaltyPrize } from "@/types"

type Props = { prize: LoyaltyPrize }

export default function EditPrize({ prize }: Props) {
  return <PrizeForm mode="edit" prize={prize} />
}

EditPrize.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>

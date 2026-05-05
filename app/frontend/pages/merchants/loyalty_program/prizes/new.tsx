import type { ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { PrizeForm } from "./_form"
import type { LoyaltyPrize } from "@/types"

type Props = { prize: Pick<LoyaltyPrize, "id" | "name" | "threshold"> }

export default function NewPrize({ prize }: Props) {
  return <PrizeForm mode="new" prize={prize} />
}

NewPrize.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>

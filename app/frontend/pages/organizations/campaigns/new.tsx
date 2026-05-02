import type { ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { CampaignForm } from "./_form"
import type { Campaign, MerchantOption } from "@/types"

type Props = {
  campaign: Campaign
  merchants: MerchantOption[]
}

export default function NewCampaign({ campaign, merchants }: Props) {
  return <CampaignForm mode="new" campaign={campaign} merchants={merchants} />
}

NewCampaign.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>

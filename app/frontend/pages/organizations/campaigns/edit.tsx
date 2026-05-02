import type { ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { CampaignForm } from "./_form"
import type { Campaign, MerchantOption } from "@/types"

type Props = {
  campaign: Campaign
  merchants: MerchantOption[]
}

export default function EditCampaign({ campaign, merchants }: Props) {
  return <CampaignForm mode="edit" campaign={campaign} merchants={merchants} />
}

EditCampaign.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>

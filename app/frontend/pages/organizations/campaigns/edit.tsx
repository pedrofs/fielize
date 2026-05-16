import type { ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { CampaignForm } from "./_form"
import type { Campaign } from "@/types"

type Props = {
  campaign: Campaign
}

export default function EditCampaign({ campaign }: Props) {
  return <CampaignForm mode="edit" campaign={campaign} />
}

EditCampaign.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>

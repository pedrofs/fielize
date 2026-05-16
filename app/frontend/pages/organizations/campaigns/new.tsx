import type { ReactNode } from "react"

import { AppLayout } from "@/layouts/app-layout"
import { CampaignForm } from "./_form"
import type { Campaign } from "@/types"

type Props = {
  campaign: Campaign
}

export default function NewCampaign({ campaign }: Props) {
  return <CampaignForm mode="new" campaign={campaign} />
}

NewCampaign.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>

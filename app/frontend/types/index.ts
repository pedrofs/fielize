export type FlashData = {
  notice?: string
  alert?: string
}

export type CurrentUser = {
  id: string
  clerkId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  organizationId: string | null
  merchantId: string | null
}

export type CurrentOrganization = {
  id: string
  clerkOrganizationId: string
  name: string | null
  slug: string | null
  imageUrl: string | null
}

export type CurrentMerchant = {
  id: string
  name: string
  organizationId: string
}

export type Breadcrumb = {
  label: string
  path: string
}

export type SharedProps = {
  currentUser: CurrentUser | null
  currentOrganization: CurrentOrganization | null
  currentMerchant: CurrentMerchant | null
  title: string | null
  breadcrumbs: Breadcrumb[]
}

// ---- Campaigns ----

export type EntryPolicy = "simple" | "cumulative"
export type CampaignStatus = "draft" | "active" | "ended"

export type Prize = {
  id: string
  name: string
  threshold: number | null
  position: number
}

export type PrizeInput = {
  id?: string
  name: string
  threshold: number | null
  position: number
  _destroy?: boolean
}

export type CampaignSummary = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  entryPolicy: EntryPolicy
  startsAt: string | null
  endsAt: string | null
  merchantsCount: number
  prizesCount: number
}

export type Campaign = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  startsAt: string | null
  endsAt: string | null
  entryPolicy: EntryPolicy
  requiresValidation: boolean
  dayCap: number | null
  merchantIds: string[]
  prizes: Prize[]
}

export type MerchantOption = {
  id: string
  name: string
}

// ---- Merchant surface ----

export type LoyaltyProgramStatus = "draft" | "active" | "ended"

export type LoyaltyPrize = {
  id: string
  name: string
  threshold: number
  position: number
}

export type LoyaltyProgram = {
  id: string
  name: string
  status: LoyaltyProgramStatus
  effectiveFromAt: string | null
}

export type RedemptionPreviewPrize = {
  id: string
  name: string
  threshold: number
  claimable: boolean
  missing: number
}

export type MerchantCustomer = {
  id: string
  name: string
  phone: string
}

export type CampaignProgressLine =
  | { kind: "loyalty"; id: string; name: string; balance: number }
  | { kind: "organization"; id: string; name: string; entries: number; entryPolicy: EntryPolicy }

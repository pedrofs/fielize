export type FlashData = {
  notice?: string
  alert?: string
}

export type Membership = {
  organizationId: string
  organizationName: string | null
  organizationSlug: string | null
  role: "owner" | "member"
  merchantId: string | null
}

export type CurrentUser = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  memberships: Membership[]
}

export type CurrentOrganization = {
  id: string
  name: string | null
  slug: string | null
  imageUrl: string | null
}

export type CurrentMerchant = {
  id: string
  name: string
  organizationId: string
}

export type CurrentCustomer = {
  id: string
  verified: boolean
  enrolledCampaignIds: string[]
}

export type Breadcrumb = {
  label: string
  path: string
}

export type SharedProps = {
  currentUser: CurrentUser | null
  currentOrganization: CurrentOrganization | null
  currentMerchant: CurrentMerchant | null
  currentCustomer: CurrentCustomer | null
  title: string | null
  breadcrumbs: Breadcrumb[]
}

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
  prizes: Prize[]
  description: string | null
  terms: string | null
  heroImageUrl: string | null
}

export type MerchantOption = {
  id: string
  name: string
}

export type CampaignMerchantRow = {
  merchantId: string
  name: string
  stampsCount: number
  distinctCustomersCount: number
  joinedAt: string
}

export type RafflePanelPrize = {
  id: string
  name: string
  threshold: number | null
  poolSize: number
}

export type RafflePanelData = {
  state: "open"
  prizes: RafflePanelPrize[]
}

export type CampaignChrome = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  startsAt: string | null
  endsAt: string | null
  entryPolicy: EntryPolicy
  dayCap: number | null
  prizes: Prize[]
  rafflePanel: RafflePanelData | null
}

export type EnrollmentProgress =
  | { kind: "cumulative"; merchantsStamped: number; nextPrizeThreshold: number | null }
  | { kind: "simple"; entries: number }

export type EnrollmentRow = {
  customer: {
    id: string
    displayName: string
    phoneMasked: string | null
  }
  consentedAt: string
  stampsCount: number
  progress: EnrollmentProgress
}

export type Pagination = {
  page: number
  pages: number
  count: number
  limit: number
  prev: number | null
  next: number | null
}

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

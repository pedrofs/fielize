export type FlashData = {
  notice?: string
  alert?: string
}

export type CurrentUser = {
  id: number
  clerkId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  organizationId: number | null
  merchantId: number | null
}

export type CurrentOrganization = {
  id: number
  clerkOrganizationId: string
  name: string | null
  slug: string | null
  imageUrl: string | null
}

export type CurrentMerchant = {
  id: number
  name: string
  organizationId: number
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

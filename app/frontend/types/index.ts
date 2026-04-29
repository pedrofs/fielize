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
  organizationClerkId: string | null
}

export type Breadcrumb = {
  label: string
  path: string
}

export type SharedProps = {
  currentUser: CurrentUser | null
  title: string | null
  breadcrumbs: Breadcrumb[]
}

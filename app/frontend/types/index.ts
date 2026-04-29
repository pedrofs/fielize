export type FlashData = {
  notice?: string
  alert?: string
}

export type CurrentUser = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  image_url: string | null
}

export type SharedProps = {
  currentUser: CurrentUser | null
}

import type { ReactNode } from "react"
import { usePage } from "@inertiajs/react"

import { AppLayout } from "@/layouts/app-layout"

export default function Home() {
  const { props } = usePage()

  return (
    <>
      <p>Hello, {props.currentUser?.firstName}</p>

      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
        <div className="aspect-video rounded-xl bg-muted/50" />
      </div>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
    </>
  )
}

Home.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>

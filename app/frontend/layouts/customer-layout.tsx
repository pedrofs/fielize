import { Head, usePage } from "@inertiajs/react"
import type { ReactNode } from "react"

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { props } = usePage()
  const title = props.title

  return (
    <>
      <Head title={title ?? undefined} />
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-screen-sm flex-col px-4 pb-8">
          {children}
        </div>
      </div>
    </>
  )
}

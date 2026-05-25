import { Link, usePage } from "@inertiajs/react"
import { useEffect, useState, type ReactNode } from "react"

import { CustomerLayout } from "@/layouts/customer-layout"

type Enrollment = {
  id: string
  campaignId: string
  campaignName: string
  url: string
}

type WalletOrganization = {
  id: string
  name: string | null
  slug: string | null
  imageUrl: string | null
  url: string
  enrollments: Enrollment[]
}

type Wallet = {
  recognized: boolean
  organizations: WalletOrganization[]
}

type Props = {
  wallet: Wallet
}

function OrgEnrollmentList({ organization }: { organization: WalletOrganization }) {
  return (
    <section className="flex flex-col gap-2" data-testid="wallet-org">
      <header className="flex items-center gap-3">
        {organization.imageUrl && (
          <img
            src={organization.imageUrl}
            alt=""
            className="size-10 rounded-full border bg-background object-cover"
          />
        )}
        <Link
          href={organization.url}
          className="text-sm font-semibold underline-offset-2 hover:underline"
        >
          {organization.name}
        </Link>
      </header>
      <ul className="flex flex-col divide-y rounded-lg border bg-card">
        {organization.enrollments.map((enrollment) => (
          <li key={enrollment.id}>
            <Link
              href={enrollment.url}
              className="flex items-center justify-between p-4 hover:bg-accent/30"
              data-testid="wallet-enrollment"
            >
              <span className="font-medium">{enrollment.campaignName}</span>
              <span className="text-sm text-muted-foreground" aria-hidden>
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Placeholder() {
  return (
    <article
      className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center"
      data-testid="wallet-placeholder"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-muted text-3xl">
        👋
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Bem-vindo à Fielize</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Suas inscrições em campanhas vão aparecer aqui. Acesse a página de uma
        organização e toque em <span className="font-medium">Quero participar</span>{" "}
        para começar.
      </p>
    </article>
  )
}

function FlashToast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 5000)
    return () => window.clearTimeout(timer)
  }, [])

  if (!visible) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-3 z-50 mx-auto max-w-screen-sm px-4"
      data-testid="flash-toast"
    >
      <div className="rounded-md bg-foreground/95 px-4 py-3 text-sm text-background shadow-lg">
        {message}
      </div>
    </div>
  )
}

export default function CustomerCardsIndex({ wallet }: Props) {
  const flash = usePage().flash

  if (!wallet.recognized || wallet.organizations.length === 0) {
    return (
      <>
        {flash?.notice && <FlashToast message={flash.notice} />}
        <Placeholder />
      </>
    )
  }

  return (
    <article className="flex flex-col gap-6 py-6">
      {flash?.notice && <FlashToast message={flash.notice} />}

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Meus cartões</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas campanhas em todas as organizações.
        </p>
      </header>

      <div className="flex flex-col gap-6" data-testid="wallet-enrollments">
        {wallet.organizations.map((organization) => (
          <OrgEnrollmentList key={organization.id} organization={organization} />
        ))}
      </div>
    </article>
  )
}

CustomerCardsIndex.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)

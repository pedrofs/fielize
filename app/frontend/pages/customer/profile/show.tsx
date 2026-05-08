import { Link, useForm, usePage } from "@inertiajs/react"
import { useEffect, useState, type FormEvent, type ReactNode } from "react"

import { CustomerLayout } from "@/layouts/customer-layout"
import { Button } from "@/components/ui/button"

type Enrollment = {
  id: string
  campaignId: string
  campaignName: string
  url: string
}

type ProfileOrganization = {
  id: string
  name: string | null
  slug: string | null
  imageUrl: string | null
  url: string
  enrollments: Enrollment[]
}

type Profile = {
  recognized: boolean
  verified: boolean
  organizations: ProfileOrganization[]
}

type Props = {
  profile: Profile
}

function VerifiedBanner() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      data-testid="profile-verified-banner"
    >
      <span aria-hidden className="text-base">✓</span>
      <span>WhatsApp confirmado</span>
    </div>
  )
}

function ResendBanner() {
  const { post, processing } = useForm({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    post("/me/verification_requests")
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-lg border bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <span>
        Seu WhatsApp ainda não foi confirmado. Toque para reenviar o link.
      </span>
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={processing}
        data-testid="profile-verification-resend"
      >
        Reenviar confirmação
      </Button>
    </form>
  )
}

function OrgEnrollmentList({ organization }: { organization: ProfileOrganization }) {
  return (
    <section className="flex flex-col gap-2" data-testid="profile-org">
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
              data-testid="profile-enrollment"
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

function ForgetMeLink() {
  const { delete: destroy, processing } = useForm({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    destroy("/me/session")
  }

  return (
    <form onSubmit={submit} className="pt-4">
      <button
        type="submit"
        disabled={processing}
        className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:opacity-50"
        data-testid="profile-forget-me"
      >
        Esquecer este dispositivo
      </button>
    </form>
  )
}

function Placeholder() {
  return (
    <article
      className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center"
      data-testid="profile-placeholder"
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

export default function CustomerProfileShow({ profile }: Props) {
  const flash = usePage().flash

  if (!profile.recognized || profile.organizations.length === 0) {
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Minhas inscrições
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas campanhas em todas as organizações.
        </p>
      </header>

      {profile.verified ? <VerifiedBanner /> : <ResendBanner />}

      <div
        className="flex flex-col gap-6"
        data-testid="profile-enrollments"
      >
        {profile.organizations.map((organization) => (
          <OrgEnrollmentList
            key={organization.id}
            organization={organization}
          />
        ))}
      </div>

      <ForgetMeLink />
    </article>
  )
}

CustomerProfileShow.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)

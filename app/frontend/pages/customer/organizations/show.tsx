import type { ReactNode } from "react"

import { CustomerLayout } from "@/layouts/customer-layout"

type Organization = {
  id: string
  name: string | null
  slug: string
  imageUrl: string | null
}

type Merchant = {
  id: string
  name: string
  address: string | null
}

type Props = {
  organization: Organization
  merchants: Merchant[]
  emptyState: boolean
}

function OrgHeader({ organization }: { organization: Organization }) {
  return (
    <header className="flex flex-col items-center gap-3 pt-8 pb-6 text-center">
      {organization.imageUrl && (
        <img
          src={organization.imageUrl}
          alt={organization.name ?? ""}
          className="size-20 rounded-full object-cover"
        />
      )}
      <h1 className="text-2xl font-semibold tracking-tight">
        {organization.name}
      </h1>
    </header>
  )
}

export default function CustomerOrganizationShow({
  organization,
  merchants,
  emptyState,
}: Props) {
  if (emptyState) {
    return (
      <>
        <OrgHeader organization={organization} />
        <section className="flex flex-1 items-center justify-center">
          <p
            className="max-w-xs text-center text-sm text-muted-foreground"
            data-testid="empty-state"
          >
            Esta organização ainda está sendo configurada. Volte em breve!
          </p>
        </section>
      </>
    )
  }

  return (
    <>
      <OrgHeader organization={organization} />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Lojistas participantes</h2>

        {merchants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lojista cadastrado ainda.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border bg-card">
            {merchants.map((merchant) => (
              <li key={merchant.id} className="flex flex-col gap-1 p-4">
                <span className="font-medium">{merchant.name}</span>
                {merchant.address && (
                  <span className="text-sm text-muted-foreground">
                    {merchant.address}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

CustomerOrganizationShow.layout = (page: ReactNode) => (
  <CustomerLayout>{page}</CustomerLayout>
)

import type { ReactNode } from "react"
import { Link } from "@inertiajs/react"
import { PlusIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { AppLayout } from "@/layouts/app-layout"
import { Button } from "@/components/ui/button"

type Merchant = {
  id: number
  name: string
  organizationId: number
  createdAt: string
}

type Props = {
  merchants: Merchant[]
}

export default function MerchantsIndex({ merchants }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {merchants.length === 0
            ? "No merchants yet."
            : `${merchants.length} merchant${merchants.length === 1 ? "" : "s"}.`}
        </p>
        <Button asChild>
          <Link href="/organizations/merchants/new">
            <PlusIcon data-icon="inline-start" />
            New merchant
          </Link>
        </Button>
      </div>

      {merchants.length > 0 && (
        <div className="rounded-md border">
          <ul className="divide-y">
            {merchants.map((merchant) => (
              <li
                key={merchant.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex flex-col">
                  <Link
                    href={`/organizations/merchants/${merchant.id}`}
                    className="font-medium hover:underline"
                  >
                    {merchant.name}
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/organizations/merchants/${merchant.id}/edit`}>
                      <PencilIcon />
                      <span className="sr-only">Edit</span>
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="text-destructive hover:text-destructive"
                  >
                    <Link
                      href={`/organizations/merchants/${merchant.id}`}
                      method="delete"
                      as="button"
                    >
                      <Trash2Icon />
                      <span className="sr-only">Delete</span>
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

MerchantsIndex.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>

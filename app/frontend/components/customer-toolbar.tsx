import { Link, usePage } from "@inertiajs/react"
import { CreditCardIcon, UserIcon } from "lucide-react"
import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

type Tab = {
  label: string
  href: string
  icon: ComponentType<{ className?: string }>
  testId: string
  isActive: (path: string) => boolean
}

const TABS: Tab[] = [
  {
    label: "Cartões",
    href: "/me",
    icon: CreditCardIcon,
    testId: "toolbar-tab-cartoes",
    // The wallet owns "/me" and its card drill-downs ("/me/cartoes/:id") —
    // not "/me/perfil", and not the org/merchant pages ("/o/…", "/m/…").
    isActive: (path) => path === "/me" || path.startsWith("/me/cartoes"),
  },
  {
    label: "Perfil",
    href: "/me/perfil",
    icon: UserIcon,
    testId: "toolbar-tab-perfil",
    isActive: (path) => path.startsWith("/me/perfil"),
  },
]

function currentPath(url: string): string {
  // usePage().url is path + query; strip the query for matching.
  return url.split(/[?#]/)[0]
}

export function CustomerToolbar() {
  const { props, url } = usePage()
  const path = currentPath(url)

  // An unidentified first-time visitor has no wallet or profile yet — a nav
  // pointing at them would be misleading, so don't render the toolbar at all.
  if (!props.currentCustomer) return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom)]"
      data-testid="customer-toolbar"
    >
      <ul className="mx-auto flex max-w-screen-sm">
        {TABS.map((tab) => {
          const active = tab.isActive(path)
          const Icon = tab.icon
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                data-testid={tab.testId}
                data-active={active ? "true" : "false"}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

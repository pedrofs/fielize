import * as React from "react"
import { Link, usePage, router } from "@inertiajs/react"
import {
  HomeIcon,
  StoreIcon,
  MegaphoneIcon,
  CreditCardIcon,
  BadgeCheckIcon,
  GiftIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  BuildingIcon,
} from "lucide-react"

import type { SharedProps, Membership } from "@/types"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { url, props: pageProps } = usePage<SharedProps>()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const memberships = pageProps.currentUser?.memberships ?? []
  const isOrganizationUser = memberships.some((m) => m.merchantId === null)
  const isMerchantUser = memberships.some((m) => m.merchantId !== null)
  const orgMemberships = memberships.filter((m) => m.merchantId === null)
  const activeOrg = pageProps.currentOrganization
  const user = pageProps.currentUser

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link
          href="/"
          className={
            collapsed
              ? "flex items-center justify-center px-0 py-1.5"
              : "flex items-center gap-2 px-2 py-1.5"
          }
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            F
          </div>
          {!collapsed && <span className="font-semibold">Fielize</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Início"
                isActive={url === "/"}
              >
                <Link href="/">
                  <HomeIcon />
                  <span>Início</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isMerchantUser && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Cartão Fidelidade"
                    isActive={url.startsWith("/merchants/loyalty_program")}
                  >
                    <Link href="/merchants/loyalty_program">
                      <CreditCardIcon />
                      <span>Cartão Fidelidade</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Campanhas"
                    isActive={url.startsWith("/merchants/campaigns")}
                  >
                    <Link href="/merchants/campaigns">
                      <MegaphoneIcon />
                      <span>Campanhas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Validar"
                    isActive={url.startsWith("/merchants/validations")}
                  >
                    <Link href="/merchants/validations/new">
                      <BadgeCheckIcon />
                      <span>Validar</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Resgatar"
                    isActive={url.startsWith("/merchants/redemptions")}
                  >
                    <Link href="/merchants/redemptions/new">
                      <GiftIcon />
                      <span>Resgatar</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            {isOrganizationUser && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Lojistas"
                    isActive={url.startsWith("/organizations/merchants")}
                  >
                    <Link href="/organizations/merchants">
                      <StoreIcon />
                      <span>Lojistas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Campanhas"
                    isActive={url.startsWith("/organizations/campaigns")}
                  >
                    <Link href="/organizations/campaigns">
                      <MegaphoneIcon />
                      <span>Campanhas</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {orgMemberships.length > 1 && !isMerchantUser && (
          <div
            className={
              collapsed
                ? "flex justify-center px-0 py-1.5"
                : "flex items-center px-2 py-1.5"
            }
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-md p-1 text-sm hover:bg-sidebar-accent">
                  <BuildingIcon className="size-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="truncate font-medium">
                        {activeOrg?.name ?? "Selecionar organização"}
                      </span>
                      <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                {orgMemberships.map((m: Membership) => (
                  <DropdownMenuItem
                    key={m.organizationId}
                    onClick={() => {
                      router.post(
                        `/organizations/${m.organizationId}/switching`,
                        {},
                        { preserveScroll: true }
                      )
                    }}
                  >
                    <BuildingIcon className="mr-2 size-4" />
                    <span>{m.organizationName}</span>
                    {m.organizationId === activeOrg?.id && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Ativa
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        <div
          className={
            collapsed
              ? "flex justify-center px-0 py-1.5"
              : "flex items-center px-2 py-1.5"
          }
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md p-1 text-sm hover:bg-sidebar-accent">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {user?.firstName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                {!collapsed && (
                  <>
                    <span className="truncate font-medium">
                      {user?.firstName || user?.email}
                    </span>
                    <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.delete("/session")}
              >
                <LogOutIcon className="mr-2 size-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

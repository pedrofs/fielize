import * as React from "react"
import { Link, usePage } from "@inertiajs/react"
import { OrganizationSwitcher, UserButton } from "@clerk/react"
import {
  HomeIcon,
  StoreIcon,
  MegaphoneIcon,
  CreditCardIcon,
  BadgeCheckIcon,
  GiftIcon,
} from "lucide-react"

import type { SharedProps } from "@/types"

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { url, props: pageProps } = usePage<SharedProps>()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const isOrganizationUser = !!pageProps.currentUser?.organizationId
  const isMerchantUser = !!pageProps.currentUser?.merchantId

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
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
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
        {!isMerchantUser && (
          <div
            className={
              collapsed
                ? "flex justify-center px-0 py-1.5"
                : "flex items-center px-2 py-1.5"
            }
          >
            <OrganizationSwitcher
              hidePersonal={false}
              appearance={{
                elements: {
                  rootBox: collapsed ? "" : "w-full",
                  organizationSwitcherTrigger: collapsed
                    ? "p-1 rounded-md hover:bg-sidebar-accent"
                    : "w-full justify-between p-1 rounded-md hover:bg-sidebar-accent",
                  organizationPreview: collapsed ? "gap-0" : ""
                },
              }}
            />
          </div>
        )}
        <div
          className={
            collapsed
              ? "flex justify-center px-0 py-1.5"
              : "flex items-center px-2 py-1.5"
          }
        >
          <UserButton
            showName={!collapsed}
            appearance={{
              elements: {
                rootBox: collapsed ? "" : "w-full",
                userButtonTrigger: collapsed
                  ? "p-1 rounded-md hover:bg-sidebar-accent"
                  : "w-full justify-start gap-2 p-1 rounded-md hover:bg-sidebar-accent",
                userButtonBox: collapsed ? "" : "flex-row w-full gap-2 min-w-0",
                userButtonOuterIdentifier: collapsed
                  ? "!hidden"
                  : "text-sm font-medium truncate",
              },
            }}
          />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

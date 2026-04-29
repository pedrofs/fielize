import * as React from "react"
import { Link, usePage } from "@inertiajs/react"
import { OrganizationSwitcher, UserButton } from "@clerk/react"
import { HomeIcon } from "lucide-react"

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
  const { url } = usePage()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Home"
                isActive={url === "/"}
              >
                <Link href="/">
                  <HomeIcon />
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
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
                userButtonBox: collapsed ? "" : "flex-row-reverse w-full justify-end",
                userButtonOuterIdentifier: collapsed
                  ? "!hidden"
                  : "text-sm font-medium",
              },
            }}
          />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

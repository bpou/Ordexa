"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Settings2Icon } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { getSidebarConfig } from "@/components/sidebar-config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { SidebarRevealText } from "@/components/sidebar-reveal-text";

export function AppSidebar({
  className,
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname() ?? "/dashboard";
  const { data: session } = useSession();
  const data = getSidebarConfig(pathname);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canCreateRegisters = role === "ADMIN" || role === "SALJARE";
  const navMain = canCreateRegisters
    ? data.navMain
    : data.navMain.map((item) => ({
        ...item,
        items: item.items?.filter(
          (subItem) =>
            subItem.url !== "/customers/new" &&
            subItem.url !== "/articles/new"
        ),
      }));

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className={cn("top-18", className)}
    >
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter className="gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Inställningar"
              isActive={pathname.startsWith("/account")}
              aria-label="Inställningar"
            >
              <Link href="/account">
                <Settings2Icon />
                <SidebarRevealText text="Inställningar" className="flex-1" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

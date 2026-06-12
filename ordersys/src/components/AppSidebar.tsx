"use client";

import Image from "next/image";
import Link from "next/link";
import NavLinks from "@/components/NavLinks";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

export default function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/logo.png"
            alt="Ordina"
            width={128}
            height={28}
            className="h-7 w-auto object-contain"
            priority
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <NavLinks />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="grid grid-cols-2 gap-2">
          <a
            href="#"
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/85 shadow-sm transition-colors duration-200 hover:bg-neutral-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
          >
            Hjälp & support
          </a>
          <a
            href="#"
            className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
          >
            Inställningar
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

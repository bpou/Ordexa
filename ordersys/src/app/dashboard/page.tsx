import { getServerSession } from "next-auth";

import { AppSidebar } from "@/components/app-sidebar";
import DashboardCreatedOrdersChart from "@/components/dashboard-created-orders-chart";
import { DashboardGrid, DashboardGridItem } from "@/components/dashboard-grid";
import DashboardOperationalCockpit from "@/components/dashboard-operational-cockpit";
import DashboardQuickActions from "@/components/dashboard-quick-actions";
import DashboardRecentOrders from "@/components/dashboard-recent-orders";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { authOptions } from "@/lib/auth";

export default async function Page() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name || session?.user?.email || "teamet";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbPage>Översikt</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <DashboardGrid>
          <DashboardGridItem span="full">
            <DashboardOperationalCockpit name={name} />
          </DashboardGridItem>
          <DashboardGridItem span="half">
            <DashboardRecentOrders className="h-[28rem]" />
          </DashboardGridItem>
          <DashboardGridItem span="half">
            <DashboardQuickActions className="h-[28rem]" />
          </DashboardGridItem>
          <DashboardGridItem span="full">
            <DashboardCreatedOrdersChart />
          </DashboardGridItem>
        </DashboardGrid>
      </SidebarInset>
    </SidebarProvider>
  );
}

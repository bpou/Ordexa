import { getServerSession } from "next-auth";

import DashboardCreatedOrdersChart from "@/components/dashboard-created-orders-chart";
import { DashboardGrid, DashboardGridItem } from "@/components/dashboard-grid";
import DashboardOperationalCockpit from "@/components/dashboard-operational-cockpit";
import DashboardQuickActions from "@/components/dashboard-quick-actions";
import DashboardRecentOrders from "@/components/dashboard-recent-orders";
import { authOptions } from "@/lib/auth";

export default async function Page() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name || session?.user?.email || "teamet";

  return (
    <DashboardGrid className="p-0">
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
  );
}

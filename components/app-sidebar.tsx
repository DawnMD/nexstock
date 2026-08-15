"use client";

import { NavMain, type NavSection } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  IconDashboard,
  IconPackage,
  IconStack2,
  IconTruck,
  IconSearch,
  IconShoppingCart,
  IconAdjustments,
  IconBuildingWarehouse,
  IconClipboardList,
  IconMapPin,
  IconRuler,
  IconTag,
  IconFileInvoice,
  IconChecklist,
  IconSend,
  IconChartBar,
} from "@tabler/icons-react";
import Link from "next/link";

/**
 * Grouped rather than flat: the list is long enough now that "which of these is
 * outbound?" was a real question, and the two directions share a lot of noun
 * vocabulary (orders, items, locations).
 */
export const navSections: NavSection[] = [
  {
    items: [{ title: "Dashboard", url: "/dashboard", icon: IconDashboard }],
  },
  {
    label: "Inbound",
    items: [
      { title: "Orders", url: "/orders", icon: IconPackage },
      { title: "Dock Booking List", url: "/dock-booking", icon: IconTruck },
      { title: "Quality Check", url: "/quality-check", icon: IconSearch },
      { title: "Receive", url: "/receive", icon: IconShoppingCart },
      { title: "Putaway", url: "/putaway", icon: IconMapPin },
      { title: "LPN List", url: "/lpn-list", icon: IconClipboardList },
      { title: "Adjustments", url: "/adjustments", icon: IconAdjustments },
    ],
  },
  {
    label: "Outbound",
    items: [
      { title: "Sales Orders", url: "/sales-orders", icon: IconFileInvoice },
      { title: "Pick List", url: "/pick", icon: IconChecklist },
      { title: "Ship", url: "/ship", icon: IconSend },
    ],
  },
  {
    label: "Warehouse",
    items: [
      { title: "Inventory", url: "/inventory", icon: IconBuildingWarehouse },
      { title: "SKUs", url: "/skus", icon: IconTag },
      { title: "Locations", url: "/locations", icon: IconRuler },
      { title: "Reports", url: "/reports", icon: IconChartBar },
    ],
  },
];

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar: string };
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard" />}
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <IconStack2 className="!size-5" />
              <span className="text-base font-semibold">NexStock</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={navSections} />
        <ThemeToggle className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

"use client";

import { NavMain } from "@/components/nav-main";
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
  IconInnerShadowTop,
  IconPackage,
  IconTruck,
  IconSearch,
  IconShoppingCart,
  IconAdjustments,
  IconBuildingWarehouse,
  IconClipboardList,
  IconMapPin,
  IconRuler,
  IconTag,
} from "@tabler/icons-react";
import Link from "next/link";

export const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Orders",
      url: "/orders",
      icon: IconPackage,
    },
    {
      title: "Dock Booking List",
      url: "/dock-booking",
      icon: IconTruck,
    },
    {
      title: "Quality Check",
      url: "/quality-check",
      icon: IconSearch,
    },
    {
      title: "Receive",
      url: "/receive",
      icon: IconShoppingCart,
    },
    {
      title: "Putaway",
      url: "/putaway",
      icon: IconMapPin,
    },
    {
      title: "Inventory",
      url: "/inventory",
      icon: IconBuildingWarehouse,
    },
    {
      title: "Adjustments",
      url: "/adjustments",
      icon: IconAdjustments,
    },
    {
      title: "LPN List",
      url: "/lpn-list",
      icon: IconClipboardList,
    },
    {
      title: "SKUs",
      url: "/skus",
      icon: IconTag,
    },
    {
      title: "Locations",
      url: "/locations",
      icon: IconRuler,
    },
  ],
};

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
              <IconInnerShadowTop className="!size-5" />
              <span className="text-base font-semibold">Shelf Sync</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <ThemeToggle className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

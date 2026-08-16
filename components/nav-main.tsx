"use client";

import { type Icon } from "@tabler/icons-react";
import Link from "next/link";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

export interface NavItem {
  title: string;
  url: string;
  icon?: Icon;
}

export interface NavSection {
  /** Omitted for the top group, which needs no heading above one link. */
  label?: string;
  items: NavItem[];
}

export function NavMain({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();

  return (
    <>
      {sections.map((section, index) => (
        <SidebarGroup key={section.label ?? `section-${index}`}>
          {section.label && (
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          )}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                    // `startsWith` so a detail route keeps its section link lit.
                    isActive={pathname.startsWith(item.url)}
                  >
                    {item.icon && <item.icon className="size-4" />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

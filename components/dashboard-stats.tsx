"use client";

import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";

export function DashboardStats() {
  const [stats] = api.order.getOrderStats.useSuspenseQuery();

  const statCards = [
    {
      title: "Total Orders",
      value: stats.total,
      key: "total",
    },
    {
      title: "Standard Orders",
      value: stats.STANDARD,
      key: "STANDARD",
    },
    {
      title: "Import Orders",
      value: stats.IMPORT,
      key: "IMPORT",
    },
    {
      title: "Return Orders",
      value: stats.RETURN,
      key: "RETURN",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <Card className="p-6" key={card.key}>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-sm font-medium">
              {card.title}
            </span>
            <span className="text-2xl font-bold">{card.value}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

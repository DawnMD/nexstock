"use client";

import { Card } from "@/components/ui/card";

type OrderStats = {
  STANDARD: number;
  IMPORT: number;
  RETURN: number;
  total: number;
};

interface DashboardStatsProps {
  stats: OrderStats;
}

export function DashboardStats({ stats }: DashboardStatsProps) {
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

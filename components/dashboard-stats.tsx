"use client";

import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { DashboardDatePicker } from "./dashboard-date-picker";
import { useCallback } from "react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

interface DashboardStatsProps {
  initialDate: Date;
}

export function DashboardStats({ initialDate }: DashboardStatsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stats] = api.order.getOrderStats.useSuspenseQuery({
    date: initialDate,
  });

  const handleDateChange = useCallback(
    (date: Date) => {
      const dateString = format(date, "yyyy-MM-dd");
      const params = new URLSearchParams(searchParams);
      params.set("date", dateString);
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams],
  );

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
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-end">
          <DashboardDatePicker
            date={initialDate}
            onDateChange={handleDateChange}
          />
        </div>
      </div>
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
    </div>
  );
}

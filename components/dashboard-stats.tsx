"use client";

import { Card } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { DashboardDatePicker } from "./dashboard-date-picker";
import { useState, useCallback } from "react";
import { startOfDay } from "date-fns";

export function DashboardStats() {
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date()),
  );
  const [stats] = api.order.getOrderStats.useSuspenseQuery(
    {
      date: selectedDate,
    },
    {
      // We don't need to refetch the stats too often, so we set a 5 minute stale time
      staleTime: 1000 * 60 * 5,
    },
  );

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(startOfDay(date));
  }, []);

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
            date={selectedDate}
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

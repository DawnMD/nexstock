"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
interface DashboardStatsProps {
  initialDate?: string | null;
}

export function DashboardStats({ initialDate }: DashboardStatsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [stats] = api.order.getOrderStats.useSuspenseQuery({
    date: initialDate,
  });

  const handleDateChange = useCallback(
    (date?: Date) => {
      const dateString = format(date ?? new Date(), "yyyy-MM-dd");
      const params = new URLSearchParams(searchParams);
      params.set("date", dateString);
      router.push(`/dashboard?${params.toString()}`);
      setOpen(false);
    },
    [router, searchParams],
  );

  const statCards = [
    {
      title: "Total Orders",
      value: stats.TOTAL,
      key: "TOTAL",
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
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="justify-start font-normal"
                />
              }
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {initialDate
                ? format(new Date(initialDate), "PPP")
                : format(new Date(), "PPP")}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={initialDate ? new Date(initialDate) : new Date()}
                onSelect={(date) => {
                  void handleDateChange(date);
                }}
              />
            </PopoverContent>
          </Popover>
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

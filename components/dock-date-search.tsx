"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ChevronDownIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

export function DockDateSearch({ date }: { date?: string | null }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams);
      params.set(name, value);
      return params.toString();
    },
    [searchParams],
  );

  const handleDateChange = async (date?: Date) => {
    router.push(
      `/dock-booking?${createQueryString("date", format(date ?? new Date(), "yyyy-MM-dd"))}`,
    );
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id="date"
              className="justify-between font-normal"
            />
          }
        >
          {format(date ? new Date(date) : new Date(), "dd MMM yyyy")}
          <ChevronDownIcon />
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date ? new Date(date) : new Date()}
            captionLayout="dropdown"
            onSelect={(date) => {
              void handleDateChange(date);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

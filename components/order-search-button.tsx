"use client";

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

export function OrderSearchButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="h-8" disabled={pending}>
      {pending ? "Searching..." : "Search"}
    </Button>
  );
}

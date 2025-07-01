"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DockBookingHeaderButton({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <Button variant="outline" size="icon" onClick={() => router.back()}>
      {children}
    </Button>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

export function AdjustmentPresentPopup() {
  const router = useRouter();

  return (
    <>
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjustments Present</DialogTitle>
            <DialogDescription>
              This order has adjustments present. Please review the adjustments
              before creating a new adjustment.
            </DialogDescription>
            <DialogFooter>
              <DialogClose asChild>
                <Button onClick={() => router.back()}>Go back</Button>
              </DialogClose>
            </DialogFooter>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The scroll region of the app shell. `SidebarProvider` is `h-dvh
 * overflow-hidden` and `SiteHeader` is `shrink-0`, so this is the only thing
 * that scrolls — which keeps every page exactly the height of the visible
 * viewport and out from behind the browser's address bar.
 */
export function PageMain({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-main"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]",
        className,
      )}
      {...props}
    />
  );
}

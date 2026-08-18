"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon, PackageIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useScanner } from "@/hooks/use-scanner";

/**
 * The scan-and-search palette behind /receive, /quality-check, /lpn-list and
 * /putaway.
 *
 * There used to be five of these, one per screen, at ~50 lines each and about
 * 95% identical — they differed by the query, the href and the subtitle line.
 * (A sixth, `received-items-order-search`, had no importers at all.) Everything
 * that made them worth fixing had to be fixed five times, so none of it was:
 * none debounced, none searched on the server, and none could tell a scan from
 * a keypress.
 *
 * Two things are worth knowing about how this behaves:
 *
 * - **`shouldFilter={false}`.** Filtering happens in Postgres now, and cmdk
 *   matching a second time over the visible label would throw away rows the
 *   server matched on something else — searching a vendor's name returns their
 *   orders, and cmdk would hide every one of them.
 * - **A scan navigates to the barcode, not to the highlight.** Enter inside a
 *   cmdk list selects whichever row is highlighted, which after a partial-match
 *   filter is simply the first one. Scanning `LPN-000123` while `LPN-0001234`
 *   sits at the top of the list is a plausible way to put stock in the wrong
 *   place, so a scan is resolved against `key` and nothing else.
 */
export interface EntitySearchItem {
  /**
   * The row's identity, and the exact string a scan of it produces — an order
   * number, an LPN. A scanned value is matched against this and nothing else.
   */
  key: string;
  /** The headline, rendered monospace. Usually the same as `key`. */
  label: string;
  subtitle: React.ReactNode;
  href: string;
  disabled?: boolean;
}

export interface EntitySearchProps {
  items: EntitySearchItem[];
  search: string;
  onSearchChange: (search: string) => void;
  /** Results are for an older term — the query behind `items` is still running. */
  isPending?: boolean;
  placeholder: string;
  heading: string;
  emptyMessage?: string;
}

export function EntitySearch({
  items,
  search,
  onSearchChange,
  isPending = false,
  placeholder,
  heading,
  emptyMessage = "No results found.",
}: EntitySearchProps) {
  const router = useRouter();
  // Set when a barcode lands, cleared once the server has answered for it. The
  // scan cannot be resolved on the spot: the term has to make a round trip
  // before the matching row exists on the client at all.
  //
  // A ref rather than state — nothing renders from it, and it is only ever read
  // and written from inside the effect below.
  const pendingScan = React.useRef<string | null>(null);

  const scanner = useScanner({
    onScan: (value) => {
      pendingScan.current = value;
      onSearchChange(value);
    },
  });

  React.useEffect(() => {
    const scanned = pendingScan.current;
    if (scanned === null) return;
    // The operator carried on typing, so the barcode is no longer what is being
    // asked for. Drop it rather than navigating out from under them.
    if (search !== scanned) {
      pendingScan.current = null;
      return;
    }
    // `items` still describes the previous term.
    if (isPending) return;

    pendingScan.current = null;

    const match = items.find(
      (item) => item.key.toLowerCase() === scanned.toLowerCase(),
    );
    if (match && !match.disabled) {
      router.push(match.href);
      return;
    }
    if (items.length === 0) {
      toast.error(`Nothing found for ${scanned}`);
    }
    // A scan that came back with results but no exact match is left on screen:
    // the operator can see what did match and choose.
  }, [items, isPending, search, router]);

  return (
    <Command shouldFilter={false}>
      <div className="relative">
        <CommandInput
          placeholder={placeholder}
          value={search}
          onValueChange={onSearchChange}
          onKeyDown={scanner.onKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          // 44px on touch. A scanner user never taps this, but the operator
          // falling back to typing on a handheld does.
          className="h-11 md:h-10"
        />
        {isPending && (
          <Loader2Icon className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
        )}
      </div>
      <CommandList>
        {items.length === 0 ? (
          // Rendered directly rather than through `<CommandEmpty>`, which keys
          // off cmdk's own filter count and so says nothing useful once
          // filtering has moved to the server.
          <div className="text-muted-foreground py-6 text-center text-sm">
            {isPending ? "Searching…" : emptyMessage}
          </div>
        ) : (
          <CommandGroup heading={heading}>
            {items.map((item) => (
              <CommandItem
                key={item.key}
                value={item.key}
                disabled={item.disabled}
                asChild
              >
                {/* A link, not a `router.push` in `onSelect`: it is what makes
                    the row middle-clickable, openable in a new tab, and visible
                    to the browser as a navigation before it happens. */}
                <Link href={item.href} className="min-h-11">
                  <PackageIcon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-mono">{item.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {item.subtitle}
                    </span>
                  </div>
                </Link>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

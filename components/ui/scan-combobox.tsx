"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";

import { ScanField, type ScanFieldProps } from "@/components/ui/scan-field";
import { cn } from "@/lib/utils";

/**
 * A `<ScanField>` with a list of known values under it.
 *
 * The rack, the pallet and the bay all have a barcode on them, and a `<Select>`
 * can read none of them — the operator had to find the label they were standing
 * in front of in a dropdown of every rack in the building. So the field takes
 * text first and offers the list second: scan it, or type it, or pick it.
 *
 * The text *is* the value. There is no separate "search term" that later
 * resolves into a selection, because a scan has to be usable the instant it
 * lands, before any round trip the suggestions need. What the list is for is
 * telling the operator whether what they scanned is a real place — `isKnown`
 * below is how the caller gates its submit.
 */
export interface ScanComboboxOption {
  value: string;
  /** Trailing detail: free capacity, quantity on hand, the zone and aisle. */
  hint?: React.ReactNode;
}

export interface ScanComboboxProps
  extends Omit<ScanFieldProps, "validate" | "confirm"> {
  options: ScanComboboxOption[];
  /** The options are still being fetched for the current text. */
  isPending?: boolean;
  emptyMessage?: string;
}

/** Whether `value` names one of `options`, case-insensitively. */
export function isKnownOption(value: string, options: ScanComboboxOption[]) {
  const needle = value.trim().toLowerCase();
  if (!needle) return false;
  return options.some((option) => option.value.toLowerCase() === needle);
}

export function ScanCombobox({
  options,
  isPending = false,
  emptyMessage = "No match.",
  value,
  onValueChange,
  onFocus,
  onBlur,
  className,
  ...props
}: ScanComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();

  const matched = options.find(
    (option) => option.value.toLowerCase() === value.trim().toLowerCase(),
  );

  return (
    <div className="relative">
      <ScanField
        {...props}
        value={value}
        onValueChange={onValueChange}
        className={className}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={(event) => {
          setOpen(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setOpen(false);
          onBlur?.(event);
        }}
      />

      {/* Confirmation that the scan landed on a real place, shown in the space
          the list would otherwise take so the form does not jump. */}
      {!open && matched?.hint && (
        <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
          <CheckIcon className="size-3 text-green-600 dark:text-green-500" />
          {matched.hint}
        </p>
      )}

      {open && (
        <div
          id={listId}
          role="listbox"
          className="bg-popover text-popover-foreground absolute top-full right-0 left-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-md border shadow-md"
        >
          {options.length === 0 ? (
            <p className="text-muted-foreground px-3 py-3 text-sm">
              {isPending ? "Searching…" : emptyMessage}
            </p>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === matched?.value}
                // `onMouseDown` rather than `onClick` alone: the blur that
                // closes this list fires first otherwise, and the row is gone
                // before the click lands on it.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm",
                  option.value === matched?.value && "bg-accent/50",
                )}
              >
                <span className="font-mono">{option.value}</span>
                {option.hint && (
                  <span className="text-muted-foreground text-xs">
                    {option.hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

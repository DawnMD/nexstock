"use client";

import * as React from "react";
import { CheckIcon, ScanLineIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useScanner } from "@/hooks/use-scanner";
import { cn } from "@/lib/utils";

/**
 * A text field that knows the difference between being typed into and being
 * scanned into.
 *
 * Barcodes are the primary input on every screen an operator uses with a
 * handheld, so the field they land in has a few obligations a plain `<Input>`
 * does not have:
 *
 * - it takes focus on mount, because nobody taps a field before scanning;
 * - autocomplete, autocorrect and autocapitalise are all off, or the browser
 *   helpfully turns `lpn-000123` into `Lpn-000123` and the lookup misses;
 * - a scan terminated by Enter is reported separately from a human pressing
 *   Enter (see `useScanner`), so the caller can act on the barcode itself
 *   rather than on whatever the UI happened to have highlighted;
 * - it says out loud that it was scanned, because the operator is looking at
 *   the pallet, not at the screen, and needs to know the read landed.
 */
export interface ScanFieldProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
  /**
   * A barcode arrived. Without this the scan just commits the value, which is
   * the right default for a field inside a larger form.
   */
  onScan?: (value: string) => void;
  /** Enter pressed by hand. Leave undefined to keep Enter's default behaviour. */
  onEnter?: (value: string) => void;
  /**
   * Inline validation, run on the current value. Return a message to show it
   * under the field, or null when the value is acceptable. Omit this inside a
   * react-hook-form field, where `<FormMessage>` already does the job.
   */
  validate?: (value: string) => string | null;
  /** Show a tick for a moment after a scan lands. Default true. */
  confirm?: boolean;
}

/** How long the "scanned" tick stays up. Long enough to catch, short enough not to lie. */
const CONFIRM_MS = 1500;

export function ScanField({
  value,
  onValueChange,
  onScan,
  onEnter,
  validate,
  confirm = true,
  className,
  autoFocus = true,
  inputMode = "text",
  onKeyDown: onKeyDownProp,
  ...props
}: ScanFieldProps) {
  const [scannedAt, setScannedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (scannedAt === null) return;
    const timer = setTimeout(() => setScannedAt(null), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [scannedAt]);

  const scanner = useScanner({
    onScan: (scanned) => {
      // The value is read off the DOM node at Enter time, so it is already what
      // the wedge typed; committing it keeps a controlled caller in step.
      onValueChange(scanned);
      if (confirm) setScannedAt(Date.now());
      onScan?.(scanned);
    },
    onEnter,
  });

  const message = validate ? validate(value) : null;
  const justScanned = scannedAt !== null;

  return (
    <div className="grid gap-2">
      <div className="relative">
        <ScanLineIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          {...props}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            scanner.onKeyDown(event);
            // Only if the scan handler did not claim it — otherwise a caller's
            // own Enter handling would fire on top of the barcode.
            if (!event.defaultPrevented) onKeyDownProp?.(event);
          }}
          autoFocus={autoFocus}
          inputMode={inputMode}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={message ? true : props["aria-invalid"]}
          className={cn(
            // 44px on touch, back to the standard 36px where there is a mouse.
            "h-11 pr-9 pl-9 font-mono md:h-9",
            justScanned && "border-green-500 ring-[3px] ring-green-500/30",
            className,
          )}
        />
        {justScanned && (
          <CheckIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-green-600 dark:text-green-500" />
        )}
      </div>
      {/* Same shape as `<FormMessage>`, for the call sites that are not inside a
          react-hook-form field and so cannot use it. */}
      {message && <p className="text-destructive text-sm">{message}</p>}
      {/* Announced rather than shown, so a scan is confirmed to a screen reader
          too — the tick above is purely visual. */}
      <span aria-live="polite" className="sr-only">
        {justScanned ? `Scanned ${value}` : ""}
      </span>
    </div>
  );
}

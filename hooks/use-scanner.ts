"use client";

import * as React from "react";

/**
 * Keyboard-wedge scanner detection.
 *
 * A handheld barcode scanner is a keyboard as far as the browser is concerned:
 * it types the barcode and presses Enter. That is indistinguishable from an
 * operator typing, which is the whole problem — inside a cmdk list, Enter
 * selects the *highlighted* row, and after a partial-match filter the
 * highlighted row need not be the one that was just scanned. Scanning
 * `LPN-000123` and landing on `LPN-0001234` is a real way to put stock in the
 * wrong place.
 *
 * What separates the two is speed. A wedge emits its characters at a fixed
 * interval, typically 5–20ms; sustained sub-30ms typing is not something hands
 * do. So the burst is timed, and only a burst that was machine-fast *and*
 * terminated by Enter counts as a scan. Everything else is left alone and
 * behaves exactly as it did before.
 *
 * This is heuristic and it is meant to be: the failure mode of guessing wrong
 * is that Enter does what Enter has always done.
 */

/** Average gap between keystrokes, in ms, at or under which input is machine-typed. */
const DEFAULT_MAX_KEYSTROKE_INTERVAL = 30;

/** Bursts shorter than this are ignored — no real barcode is two characters. */
const DEFAULT_MIN_LENGTH = 3;

/**
 * Quiet period after which the next keystroke starts a new burst. Without it,
 * typing three characters, pausing to read the shelf, then typing three more
 * would be measured as one very slow burst forever.
 */
const BURST_RESET_MS = 500;

export interface UseScannerOptions {
  /**
   * A barcode arrived. The value is read off the input at the moment Enter is
   * pressed, not accumulated from the keystrokes, so a scan into a field that
   * already held text reports what the field actually contains.
   */
  onScan: (value: string) => void;
  /**
   * Enter was pressed by a human rather than a scanner. Leave undefined to let
   * Enter keep its default behaviour (form submit, cmdk selection, …).
   */
  onEnter?: (value: string) => void;
  /** Default 30ms. Raise it for a scanner that emits slowly over Bluetooth. */
  maxKeystrokeInterval?: number;
  /** Default 3. */
  minLength?: number;
  /** Some wedges are configured with a Tab suffix instead of Enter. Default false. */
  acceptTab?: boolean;
  /** Default true. */
  enabled?: boolean;
}

export interface UseScannerResult {
  /** Spread onto the input. Composes with an existing handler via `onKeyDown`. */
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  /** Forget the burst in progress, e.g. after clearing the field. */
  reset: () => void;
}

export function useScanner({
  onScan,
  onEnter,
  maxKeystrokeInterval = DEFAULT_MAX_KEYSTROKE_INTERVAL,
  minLength = DEFAULT_MIN_LENGTH,
  acceptTab = false,
  enabled = true,
}: UseScannerOptions): UseScannerResult {
  const firstKeyAt = React.useRef(0);
  const lastKeyAt = React.useRef(0);
  const charCount = React.useRef(0);

  const reset = React.useCallback(() => {
    firstKeyAt.current = 0;
    lastKeyAt.current = 0;
    charCount.current = 0;
  }, []);

  const onKeyDown = React.useCallback<
    React.KeyboardEventHandler<HTMLInputElement>
  >(
    (event) => {
      if (!enabled) return;

      const isTerminator =
        event.key === "Enter" || (acceptTab && event.key === "Tab");

      if (isTerminator) {
        const chars = charCount.current;
        const span = lastKeyAt.current - firstKeyAt.current;
        // One interval per gap, so `chars - 1` of them. A single-character
        // burst has no interval to measure and can never be a scan anyway,
        // since `minLength` is at least 2.
        const averageInterval = chars > 1 ? span / (chars - 1) : Infinity;
        const scanned =
          chars >= minLength && averageInterval <= maxKeystrokeInterval;

        const value = event.currentTarget.value;
        reset();

        if (scanned) {
          // Both, deliberately. `preventDefault` stops a form submitting;
          // `stopPropagation` stops cmdk's list-level handler selecting
          // whichever row happens to be highlighted.
          event.preventDefault();
          event.stopPropagation();
          onScan(value);
          return;
        }

        if (onEnter) {
          event.preventDefault();
          onEnter(value);
        }
        return;
      }

      // Editing keys mean a human is involved, so whatever was in flight is not
      // a scan. Modifiers and navigation keys are simply not part of a burst.
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey) {
        if (event.key === "Backspace" || event.key === "Delete") reset();
        return;
      }

      const now = Date.now();
      if (charCount.current === 0 || now - lastKeyAt.current > BURST_RESET_MS) {
        firstKeyAt.current = now;
        charCount.current = 0;
      }
      charCount.current += 1;
      lastKeyAt.current = now;
    },
    [
      acceptTab,
      enabled,
      maxKeystrokeInterval,
      minLength,
      onEnter,
      onScan,
      reset,
    ],
  );

  return { onKeyDown, reset };
}

"use client";

import * as React from "react";

/**
 * Trails `value` by `delayMs`, resetting the clock on every change.
 *
 * Search moved from the browser to Postgres, which means every keystroke is now
 * a round trip. A scanner types a twelve-character barcode in under 200ms, so
 * without this a single scan fires a dozen queries and the last one to come
 * back — not the last one sent — decides what is on screen.
 *
 * 250ms is the usual compromise: below human keystroke cadence for a deliberate
 * typist, above the whole duration of a wedge burst.
 *
 * The commit runs inside `startTransition` because the consumers are suspending
 * queries. Without it, every keystroke would throw the palette back to its
 * `<Suspense>` skeleton — and the input the operator is typing into goes with
 * it, taking the focus and the caret. Marked non-urgent, React keeps the
 * previous results on screen until the new ones arrive.
 *
 * @returns the trailing value, and whether it is currently behind.
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs = 250,
): readonly [T, boolean] {
  const [debounced, setDebounced] = React.useState(value);
  const [isTransitioning, startTransition] = React.useTransition();

  React.useEffect(() => {
    const timer = setTimeout(
      () => startTransition(() => setDebounced(value)),
      delayMs,
    );
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  // Behind either because the timer has not fired yet, or because it has and
  // the query it triggered is still in flight.
  return [debounced, isTransitioning || !Object.is(value, debounced)] as const;
}

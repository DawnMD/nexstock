import { InfoIcon } from "lucide-react";

/**
 * Shown to a read-only demo visitor.
 *
 * The guard that actually stops writes is `writeProcedure` on the server; this
 * only explains why a button they press will fail, so they do not read a
 * refusal as a bug.
 */
export function DemoBanner({ sharedWritable }: { sharedWritable: boolean }) {
  return (
    <div className="bg-muted text-muted-foreground flex items-center justify-center gap-2 border-b px-4 py-2 text-center text-xs">
      <InfoIcon className="size-3.5 shrink-0" />
      {sharedWritable ? (
        <span>
          This is a <strong>shared demo warehouse</strong>. Your changes are
          visible to other visitors, and the data resets nightly.
        </span>
      ) : (
        <span>
          You are signed in to the <strong>read-only demo</strong>. Every screen
          works, but nothing can be changed.
        </span>
      )}
    </div>
  );
}

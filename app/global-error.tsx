"use client";

import { useEffect } from "react";

/**
 * Last resort boundary: this replaces the root layout, so it cannot rely on
 * providers, fonts, or anything from `app/layout.tsx`. It also has to render
 * its own `<html>` and `<body>`. Styling stays inline for the same reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            NexStock could not start
          </h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            {error.message || "An unexpected error occurred."}
            {error.digest ? ` (${error.digest})` : ""}
          </p>
          <button
            onClick={reset}
            style={{
              minHeight: "44px",
              padding: "0 1.5rem",
              borderRadius: "0.5rem",
              border: "1px solid #ccc",
              background: "#111",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

import { describe, expect, it } from "vitest";

import { GET as resetDemo } from "@/app/api/internal/demo-reset/route";
import { auth } from "@/lib/auth";

import { db } from "./helpers/db";

describe("résumé deployment access", () => {
  it("rejects direct sign-up requests when registration is disabled", async () => {
    const email = "blocked-sign-up@nexstock.test";
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Blocked Visitor",
          email,
          password: "blocked-password",
        }),
      }),
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    await expect(db.user.findUnique({ where: { email } })).resolves.toBeNull();
  });

  it("does not expose the reset route without the cron bearer token", async () => {
    const missing = await resetDemo(
      new Request("http://localhost/api/internal/demo-reset"),
    );
    const incorrect = await resetDemo(
      new Request("http://localhost/api/internal/demo-reset", {
        headers: { authorization: "Bearer incorrect" },
      }),
    );

    expect(missing.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(missing.headers.get("cache-control")).toContain("no-store");
  });
});

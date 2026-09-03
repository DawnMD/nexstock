import { env } from "@/env";
import { createAdminDb } from "@/server/admin-db";
import {
  DemoResetInProgressError,
  resetDemoWarehouse,
} from "@/server/services/demo-reset";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: Request) {
  if (
    !env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`
  ) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: responseHeaders },
    );
  }

  const db = createAdminDb();
  try {
    const account = await db.user.findUnique({
      where: { email: env.DEMO_ACCOUNT_EMAIL.toLowerCase() },
      select: { id: true },
    });
    if (!account) {
      throw new Error("The configured demo account has not been provisioned.");
    }

    const result = await resetDemoWarehouse(db, { actorId: account.id });
    return Response.json(result, { status: 200, headers: responseHeaders });
  } catch (error) {
    if (error instanceof DemoResetInProgressError) {
      return Response.json(
        { error: error.message },
        { status: 409, headers: responseHeaders },
      );
    }

    console.error("Demo reset failed and was rolled back:", error);
    return Response.json(
      { error: "Demo reset failed; the previous dataset was preserved." },
      { status: 500, headers: responseHeaders },
    );
  } finally {
    await db.$disconnect();
  }
}

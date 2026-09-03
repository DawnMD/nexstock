import "server-only";

import { PrismaClient } from "../generated/prisma/client";
import { createAdapter } from "../lib/prisma-adapter";
import { resetDemoWarehouse } from "../server/services/demo-reset";
import { loadDirectUrl } from "./script-env";

const prisma = new PrismaClient({
  adapter: createAdapter(loadDirectUrl()),
});

const requestedActorId =
  process.argv
    .find((arg) => arg.startsWith("--user-id="))
    ?.slice("--user-id=".length) ?? process.env.SEED_USER_ID;

try {
  const actor = requestedActorId
    ? await prisma.user.findUnique({ where: { id: requestedActorId } })
    : await prisma.user.upsert({
        where: { id: "SYSTEM" },
        update: {},
        create: {
          id: "SYSTEM",
          name: "System",
          email: "system@nexstock.local",
          emailVerified: true,
        },
      });

  if (!actor) {
    throw new Error(
      `No user with id "${requestedActorId}" exists. Create it before seeding.`,
    );
  }

  const result = await resetDemoWarehouse(prisma, { actorId: actor.id });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Error during seeding:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

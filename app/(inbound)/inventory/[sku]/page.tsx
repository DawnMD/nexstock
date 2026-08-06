import { InventoryMovements } from "@/components/inventory-movements";
import { InventorySkuBalances } from "@/components/inventory-sku-balances";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@clerk/nextjs/server";

export default async function InventorySkuPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  await auth.protect();

  const { sku } = await params;

  await Promise.all([
    api.inventory.getBalances.prefetch({ sku }),
    api.inventory.getMovements.prefetch({ sku }),
  ]);

  return (
    <>
      <SiteHeader title={`Inventory · ${sku}`} />
      <main className="flex flex-col gap-6 p-4">
        <HydrateClient>
          <InventorySkuBalances sku={sku} />
        </HydrateClient>

        <div>
          <h3 className="mb-3 text-lg font-semibold">Movement history</h3>
          <div className="bg-card rounded-lg border">
            <HydrateClient>
              <InventoryMovements sku={sku} />
            </HydrateClient>
          </div>
        </div>
      </main>
    </>
  );
}

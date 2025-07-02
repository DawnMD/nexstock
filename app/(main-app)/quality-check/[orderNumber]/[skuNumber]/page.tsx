import { SiteHeader } from "@/components/site-header";

export default async function OrderSkuPage() {
  return (
    <>
      <SiteHeader title="Order SKU" />
      <main className="flex flex-col gap-4 p-4 lg:gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">SKU detail page</h2>
          </div>
        </div>
      </main>
    </>
  );
}

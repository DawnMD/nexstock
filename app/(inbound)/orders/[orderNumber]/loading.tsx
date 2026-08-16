import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { OrderDetailSkeleton } from "@/components/skeletons";

export default function OrderDetailLoading() {
  return (
    <>
      <SiteHeader title={"Order Details"} />
      <PageMain className="flex flex-1 flex-col p-4">
        <OrderDetailSkeleton />
      </PageMain>
    </>
  );
}

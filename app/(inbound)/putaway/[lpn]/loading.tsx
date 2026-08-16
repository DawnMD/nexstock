import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { FormSkeleton } from "@/components/skeletons";

export default function PutawayLPNLoading() {
  return (
    <>
      <SiteHeader title="Putaway" />
      <PageMain className="flex flex-col gap-4 p-4 lg:gap-6">
        <FormSkeleton />
      </PageMain>
    </>
  );
}

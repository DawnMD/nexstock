import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PackageSearchIcon } from "lucide-react";
import Link from "next/link";

export default function InboundNotFound() {
  return (
    <>
      <SiteHeader title="Not found" />
      <PageMain className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="bg-muted mb-2 flex h-10 w-10 items-center justify-center rounded-lg">
              <PackageSearchIcon className="h-5 w-5" />
            </div>
            <CardTitle>Not found</CardTitle>
            <CardDescription>
              That order, LPN, or line item does not exist, or it is not ready
              for this step yet. Check the number and scan again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="h-11 w-full sm:w-auto"
              render={<Link href="/dashboard" />}
              nativeButton={false}
            >
              Back to dashboard
            </Button>
          </CardContent>
        </Card>
      </PageMain>
    </>
  );
}

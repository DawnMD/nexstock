import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftIcon, PackageIcon, TruckIcon } from "lucide-react";

export default function OrderDetailLoading() {
  return (
    <>
      <SiteHeader title={"Order Details"} />
      <PageMain className="flex flex-1 flex-col p-4">
        <div className="flex flex-1 flex-col gap-4 lg:gap-6">
          {/* Header with back button and actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" disabled>
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="sr-only">Go back</span>
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
              </div>
            </div>
            {/* <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <PrinterIcon className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" disabled>
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div> */}
          </div>

          {/* Order header cards skeleton */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Tabs defaultValue="order-details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="order-details"
                className="flex items-center gap-2"
                disabled
              >
                <PackageIcon className="h-4 w-4" />
                Order Details
              </TabsTrigger>
              <TabsTrigger
                value="dock-bookings"
                className="flex items-center gap-2"
                disabled
              >
                <TruckIcon className="h-4 w-4" />
                Dock Bookings
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Shipping info and timeline skeleton */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from({ length: 2 }).map((_, itemIndex) => (
                    <div key={itemIndex}>
                      <Skeleton className="mb-1 h-3 w-24" />
                      <Skeleton className="h-4 w-full max-w-xs" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Line items skeleton */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Skeleton className="h-4 w-12" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-20" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-16" />
                      </TableHead>
                      <TableHead className="text-right">
                        <Skeleton className="ml-auto h-4 w-16" />
                      </TableHead>
                      <TableHead className="text-right">
                        <Skeleton className="ml-auto h-4 w-16" />
                      </TableHead>
                      <TableHead className="text-right">
                        <Skeleton className="ml-auto h-4 w-16" />
                      </TableHead>
                      <TableHead>
                        <Skeleton className="h-4 w-20" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-4 w-8" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-4 w-8" />
                        </TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-4 w-8" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageMain>
    </>
  );
}

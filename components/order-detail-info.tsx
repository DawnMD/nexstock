import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { TruckIcon, ClockIcon } from "lucide-react";

interface OrderDetailInfoProps {
  shippingInfo: {
    vendorReference: string;
    vendorName: string;
  };
  timeline: {
    orderDate: Date | null;
    expectedReceiptDate: Date | null;
  };
}

export function OrderDetailInfo({
  shippingInfo,
  timeline,
}: OrderDetailInfoProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
            <TruckIcon className="h-4 w-4" />
            Shipping Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-muted-foreground text-sm">Vendor Reference:</p>
            <p className="font-medium">{shippingInfo.vendorReference}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Vendor Name:</p>
            <p className="font-medium">{shippingInfo.vendorName}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
            <ClockIcon className="h-4 w-4" />
            Order Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-muted-foreground text-sm">Order Date:</p>
            <p className="font-medium">
              {timeline.orderDate
                ? format(new Date(timeline.orderDate), "dd MMMM yyyy")
                : "-"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">
              Expected Receipt Date:
            </p>
            <p className="font-medium">
              {timeline.expectedReceiptDate
                ? format(new Date(timeline.expectedReceiptDate), "dd MMMM yyyy")
                : "-"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

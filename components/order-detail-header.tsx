import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { TagIcon, BuildingIcon, CreditCardIcon } from "lucide-react";

interface OrderDetailHeaderProps {
  orderNumber: string;
  businessUnit: string;
  paymentStatus: PaymentStatus;
}

const getPaymentStatusVariant = (paymentStatus: PaymentStatus) => {
  switch (paymentStatus) {
    case "PAID":
      return "default";
    case "PENDING":
      return "outline";
    case "NOT_PAID":
      return "destructive";
    default:
      return "secondary";
  }
};

export function OrderDetailHeader({
  orderNumber,
  businessUnit,
  paymentStatus,
}: OrderDetailHeaderProps) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
            <TagIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Order Number</p>
            <p className="font-semibold">{orderNumber}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
            <BuildingIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Business Unit</p>
            <p className="font-semibold">{businessUnit}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
            <CreditCardIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Payment Status</p>
            <Badge
              variant={getPaymentStatusVariant(paymentStatus)}
              className="mt-1"
            >
              {paymentStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

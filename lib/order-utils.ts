import type { ActivityType } from "@/generated/prisma/enums";

export interface OrderStats {
  STANDARD: number;
  IMPORT: number;
  RETURN: number;
  TOTAL: number;
}

type OrderTypeGroup = {
  orderType: "STANDARD" | "IMPORT" | "RETURN";
  _count: {
    orderNumber: number;
  };
};

export function calculateOrderStats(orderGroups: OrderTypeGroup[]): OrderStats {
  const statsMap: OrderStats = {
    STANDARD: 0,
    IMPORT: 0,
    RETURN: 0,
    TOTAL: 0,
  };

  orderGroups.forEach((group) => {
    statsMap[group.orderType] = group._count.orderNumber;
    statsMap.TOTAL += group._count.orderNumber;
  });

  return statsMap;
}

export function getActivityType(activityType?: ActivityType) {
  switch (activityType) {
    case "CHECK_IN":
      return "Check In";
    case "CHECK_OUT":
      return "Check Out";
    case "OPEN":
      return "Open";
    case "CLOSE":
      return "Close";
    default:
      return "Scheduled";
  }
}

export const getStatusVariant = (status: string) => {
  switch (status.toUpperCase()) {
    case "NOT_RECEIVED":
      return "secondary";
    case "RECEIVING":
      return "outline";
    case "RECEIVED":
      return "default";
    case "REJECTED":
      return "destructive";
    default:
      return "secondary";
  }
};

export const formatStatusDisplay = (status: string) => {
  switch (status.toUpperCase()) {
    case "NOT_RECEIVED":
      return "Not Received";
    case "RECEIVING":
      return "Receiving";
    case "RECEIVED":
      return "Received";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
};

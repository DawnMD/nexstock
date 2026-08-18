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

/**
 * Badge variants and labels for the two status vocabularies in the app.
 *
 * These used to be one name, `getStatusVariant`, defined twice — once in
 * `lib/utils.ts` over `OrderStatus` and once here over `OrderItemStatus` — with
 * different variant sets, and nothing stopped a component importing the wrong
 * one. The vocabularies do not overlap, so they stay two functions; what changed
 * is that the name now says which one you asked for.
 */
export const getOrderStatusVariant = (status: string) => {
  switch (status.toUpperCase()) {
    case "NEW":
      return "blue";
    case "IN_PROGRESS":
      return "yellow";
    case "COMPLETED":
      return "green";
    case "CANCELLED":
      return "red";
    default:
      return "secondary";
  }
};

export const formatOrderStatus = (status: string) => {
  switch (status.toUpperCase()) {
    case "NEW":
      return "New";
    case "IN_PROGRESS":
      return "In Progress";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
};

export const getItemStatusVariant = (status: string) => {
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

export const formatItemStatus = (status: string) => {
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

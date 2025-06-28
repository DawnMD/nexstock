import type { ActivityType } from "@prisma/client";

export interface OrderStats {
  STANDARD: number;
  IMPORT: number;
  RETURN: number;
  total: number;
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
    total: 0,
  };

  orderGroups.forEach((group) => {
    statsMap[group.orderType] = group._count.orderNumber;
    statsMap.total += group._count.orderNumber;
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
      return "Unknown";
  }
}

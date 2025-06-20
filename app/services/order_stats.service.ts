import { db } from "@/server/db";

export interface OrderStats {
  STANDARD: number;
  IMPORT: number;
  RETURN: number;
  total: number;
}

export class OrderStatsService {
  static async getOrderStats(): Promise<OrderStats> {
    const stats = await db.order.groupBy({
      by: ["orderType"],
      _count: {
        orderNumber: true,
      },
    });

    const statsMap: OrderStats = {
      STANDARD: 0,
      IMPORT: 0,
      RETURN: 0,
      total: 0,
    };

    stats.forEach((stat) => {
      statsMap[stat.orderType] = stat._count.orderNumber;
      statsMap.total += stat._count.orderNumber;
    });

    return statsMap;
  }
}

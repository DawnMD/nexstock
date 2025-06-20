import { type PrismaClient } from "@prisma/client";

export interface OrderStats {
  STANDARD: number;
  IMPORT: number;
  RETURN: number;
  total: number;
}

export class OrderStatsService {
  static async getOrderStats(db: PrismaClient): Promise<OrderStats> {
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
      statsMap[stat.orderType as keyof OrderStats] = stat._count.orderNumber;
      statsMap.total += stat._count.orderNumber;
    });

    return statsMap;
  }
}

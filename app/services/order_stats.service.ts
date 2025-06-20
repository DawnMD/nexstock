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

    // Loop through each stat result from the database query
    stats.forEach((stat) => {
      // Update the count for the specific order type (STANDARD, IMPORT, or RETURN)
      // Using 'as keyof OrderStats' to tell TypeScript this is a valid key of our stats object
      statsMap[stat.orderType as keyof OrderStats] = stat._count.orderNumber;

      // Add this order type's count to the running total
      // This keeps track of all orders regardless of type
      statsMap.total += stat._count.orderNumber;
    });

    return statsMap;
  }
}

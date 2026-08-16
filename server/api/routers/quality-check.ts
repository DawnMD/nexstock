import { privateProcedure, writeProcedure } from "@/server/api/orpc";
import {
  recordQualityCheck,
  resetQualityCheck,
} from "@/server/services/quality";
import { OrderStatus } from "@/generated/prisma/client";
import { z } from "zod";

export const qualityCheckRouter = {
  getAllOrderNumbers: privateProcedure.handler(async ({ context: ctx }) => {
    const orderNumbers = await ctx.db.order.findMany({
      select: {
        orderNumber: true,
        vendor: {
          select: {
            name: true,
          },
        },
        businessUnit: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
      where: {
        status: {
          in: [OrderStatus.NEW, OrderStatus.IN_PROGRESS],
        },
      },
    });
    return orderNumbers;
  }),
  getOrderItems: privateProcedure
    .input(
      z.object({
        orderNumber: z.string(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const orderItems = await ctx.db.order.findUnique({
        where: {
          orderNumber: input.orderNumber,
        },
        select: {
          items: {
            select: {
              Sku: true,
              qualityCheck: {
                select: {
                  qualityCheckStatus: true,
                  inspectedQuantity: true,
                },
              },
              orderedQuantity: true,
              receivedQuantity: true,
              rejectedQuantity: true,
              id: true,
            },
          },
          dockBookings: {
            select: {
              dockId: true,
              activities: {
                select: {
                  activityType: true,
                },
              },
            },
          },
        },
      });

      return orderItems;
    }),
  getQualityCheckItems: privateProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ context: ctx, input: { id } }) => {
      return await ctx.db.orderItem.findUnique({
        where: { id },
        include: {
          Order: {
            include: {
              dockBookings: {
                select: {
                  dockId: true,
                  activities: {
                    select: {
                      activityType: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }),
  updateQualityCheckStatus: writeProcedure
    .input(
      z
        .object({
          id: z.number().int().positive(),
          rejectedQuantity: z.number().int().nonnegative(),
          inspectedQuantity: z.number().int().positive(),
          remarks: z.string().optional(),
        })
        .refine((data) => data.rejectedQuantity <= data.inspectedQuantity, {
          message: "Rejected quantity cannot exceed inspected quantity",
          path: ["rejectedQuantity"],
        }),
    )
    .handler(
      async ({
        context: ctx,
        input: { id, rejectedQuantity, inspectedQuantity, remarks },
      }) => {
        return await ctx.db.$transaction((tx) =>
          recordQualityCheck(tx, {
            orderItemId: id,
            rejectedQuantity,
            inspectedQuantity,
            remarks,
            inspectedBy: ctx.userId,
          }),
        );
      },
    ),
  resetQualityCheck: writeProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        resetQualityCheck(tx, {
          orderItemId: input.id,
          resetBy: ctx.userId,
        }),
      );
    }),
};

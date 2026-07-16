import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const roomsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.room.findMany({
      where: { userId: ctx.user.id },
      include: {
        plants: {
          where: { isArchived: false },
          select: { id: true, nickname: true, customName: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        tempC: z.number().optional(),
        humidityPct: z.number().optional(),
        lightLux: z.number().optional(),
        sensorDeviceId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.room.create({
        data: { ...input, userId: ctx.user.id },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        tempC: z.number().optional(),
        humidityPct: z.number().optional(),
        lightLux: z.number().optional(),
        sensorDeviceId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.room.update({
        where: { id, userId: ctx.user.id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.room.delete({
        where: { id: input.id, userId: ctx.user.id },
      });
    }),
});

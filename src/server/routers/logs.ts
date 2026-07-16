import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { evaluateAchievements } from "@/server/lib/achievements";

export const logsRouter = createTRPCRouter({
  byPlant: protectedProcedure
    .input(
      z.object({
        plantId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.careLog.findMany({
        where: {
          plantId: input.plantId,
          plant: { userId: ctx.user.id },
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { doneAt: "desc" },
        include: { task: { select: { label: true, frequencyDays: true } } },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor };
    }),

  create: protectedProcedure
    .input(
      z.object({
        plantId: z.string(),
        type: z.enum(["WATER", "SPRAY", "FERTILIZE", "FERTILIZE_MINERAL", "FERTILIZE_ORGANIC", "REPOT", "PRUNE", "CUSTOM"]),
        note: z.string().optional(),
        amount: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      await ctx.db.userPlant.findUniqueOrThrow({
        where: { id: input.plantId, userId: ctx.user.id },
      });

      const log = await ctx.db.careLog.create({
        data: input,
      });

      // Check achievements (non-blocking)
      evaluateAchievements(ctx.user.id, ctx.db).catch(() => {});

      return log;
    }),

  calendarRange: protectedProcedure
    .input(
      z.object({
        from: z.date(),
        to: z.date(),
        plantId: z.string().optional(),
        type: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.careLog.findMany({
        where: {
          plant: { userId: ctx.user.id },
          doneAt: { gte: input.from, lte: input.to },
          ...(input.plantId ? { plantId: input.plantId } : {}),
          ...(input.type ? { type: input.type as "WATER" | "SPRAY" | "FERTILIZE" | "FERTILIZE_MINERAL" | "FERTILIZE_ORGANIC" | "REPOT" | "PRUNE" | "CUSTOM" } : {}),
        },
        orderBy: { doneAt: "desc" },
        include: {
          plant: {
            select: {
              id: true,
              nickname: true,
              customName: true,
              species: { select: { commonNameRu: true, thumbnailUrl: true } },
              photos: { where: { isCover: true }, take: 1 },
            },
          },
        },
      });
    }),

  batchCreate: protectedProcedure
    .input(
      z.object({
        plantIds: z.array(z.string()).min(1).max(50),
        type: z.enum(["WATER", "SPRAY", "FERTILIZE", "FERTILIZE_MINERAL", "FERTILIZE_ORGANIC", "REPOT", "PRUNE", "CUSTOM"]),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership of all plants
      const plants = await ctx.db.userPlant.findMany({
        where: { id: { in: input.plantIds }, userId: ctx.user.id },
        select: { id: true },
      });
      const ownedIds = new Set(plants.map((p) => p.id));
      const validIds = input.plantIds.filter((id) => ownedIds.has(id));
      if (validIds.length === 0) throw new Error("No valid plants found");

      return ctx.db.careLog.createMany({
        data: validIds.map((plantId) => ({
          plantId,
          type: input.type,
          note: input.note,
        })),
      });
    }),

  recentActivity: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.careLog.findMany({
        where: { plant: { userId: ctx.user.id } },
        take: input.limit,
        orderBy: { doneAt: "desc" },
        include: {
          plant: {
            select: {
              id: true,
              nickname: true,
              customName: true,
              species: { select: { commonNameRu: true } },
            },
          },
        },
      });
    }),
});

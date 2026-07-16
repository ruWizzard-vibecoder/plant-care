import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { evaluateAchievements } from "@/server/lib/achievements";

export const growthRouter = createTRPCRouter({
  byPlant: protectedProcedure
    .input(
      z.object({
        plantId: z.string(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.growthRecord.findMany({
        where: {
          plantId: input.plantId,
          plant: { userId: ctx.user.id },
        },
        take: input.limit,
        orderBy: { recordedAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        plantId: z.string(),
        heightCm: z.number().positive().optional(),
        diameterCm: z.number().positive().optional(),
        leafCount: z.number().int().nonnegative().optional(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      await ctx.db.userPlant.findUniqueOrThrow({
        where: { id: input.plantId, userId: ctx.user.id },
      });

      const record = await ctx.db.growthRecord.create({
        data: input,
      });

      // Check achievements (non-blocking)
      evaluateAchievements(ctx.user.id, ctx.db).catch(() => {});

      return record;
    }),

  stats: protectedProcedure
    .input(z.object({ plantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const records = await ctx.db.growthRecord.findMany({
        where: {
          plantId: input.plantId,
          plant: { userId: ctx.user.id },
        },
        orderBy: { recordedAt: "asc" },
      });

      if (records.length < 2) {
        return { records, heightGrowthPct: null, leafGrowthPct: null };
      }

      const first = records[0];
      const last = records[records.length - 1];

      const heightGrowthPct =
        first.heightCm && last.heightCm
          ? Math.round(((last.heightCm - first.heightCm) / first.heightCm) * 100)
          : null;

      const leafGrowthPct =
        first.leafCount && last.leafCount
          ? Math.round(((last.leafCount - first.leafCount) / first.leafCount) * 100)
          : null;

      return { records, heightGrowthPct, leafGrowthPct };
    }),
});

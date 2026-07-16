import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { calculateRecommendations } from "@/server/lib/recommendations";

export const recommendationsRouter = createTRPCRouter({
  forDashboard: protectedProcedure.query(async ({ ctx }) => {
    const plants = await ctx.db.userPlant.findMany({
      where: { userId: ctx.user.id, isArchived: false },
      include: {
        species: {
          select: {
            commonNameRu: true,
            thumbnailUrl: true,
            waterNeed: true,
            lightNeed: true,
            humidityNeed: true,
            wateringFreqDays: true,
            fertilizingFreqDays: true,
            fertilizingOrganicFreqDays: true,
            repottingFreqDays: true,
          },
        },
        room: { select: { tempC: true, humidityPct: true } },
        photos: { where: { isCover: true }, take: 1 },
      },
    });

    // Get the most recent log per (plantId, type) in a single query
    const plantIds = plants.map((p) => p.id);
    const recentLogs = await ctx.db.careLog.findMany({
      where: { plantId: { in: plantIds } },
      orderBy: { doneAt: "desc" },
      select: { plantId: true, type: true, doneAt: true },
    });

    // Group logs by plantId
    const logsByPlant = new Map<string, typeof recentLogs>();
    for (const log of recentLogs) {
      const arr = logsByPlant.get(log.plantId) ?? [];
      arr.push(log);
      logsByPlant.set(log.plantId, arr);
    }

    const now = new Date();
    const all = plants.flatMap((plant) => {
      const logs = logsByPlant.get(plant.id) ?? [];
      return calculateRecommendations(plant, logs, now);
    });

    // Sort: overdue first, then soon, then upcoming. Skip "ok"
    const urgencyOrder = { overdue: 0, soon: 1, upcoming: 2, ok: 3 };
    return all
      .filter((r) => r.urgency !== "ok")
      .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
  }),

  forPlant: protectedProcedure
    .input(z.object({ plantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const plant = await ctx.db.userPlant.findUniqueOrThrow({
        where: { id: input.plantId, userId: ctx.user.id },
        include: {
          species: {
            select: {
              commonNameRu: true,
              thumbnailUrl: true,
              waterNeed: true,
              lightNeed: true,
              humidityNeed: true,
              wateringFreqDays: true,
              fertilizingFreqDays: true,
              fertilizingOrganicFreqDays: true,
              repottingFreqDays: true,
            },
          },
          room: { select: { tempC: true, humidityPct: true } },
          photos: { where: { isCover: true }, take: 1 },
        },
      });

      const logs = await ctx.db.careLog.findMany({
        where: { plantId: input.plantId },
        orderBy: { doneAt: "desc" },
        select: { type: true, doneAt: true },
      });

      return calculateRecommendations(plant, logs, new Date());
    }),
});

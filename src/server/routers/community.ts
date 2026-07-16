import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { getCommunityStats } from "@/server/lib/community-stats";
import { getAchievementProgress } from "@/server/lib/achievements";

export const communityRouter = createTRPCRouter({
  /** Community-wide aggregate stats */
  stats: protectedProcedure.query(async ({ ctx }) => {
    return getCommunityStats(ctx.db);
  }),

  /** User vs community comparison */
  comparison: protectedProcedure.query(async ({ ctx }) => {
    const [userProgress, community] = await Promise.all([
      getAchievementProgress(ctx.user.id, ctx.db),
      getCommunityStats(ctx.db),
    ]);

    // Calculate percentiles (how user compares to average)
    const percentiles: Record<string, number> = {};
    if (community.avgPlantsPerUser > 0) {
      percentiles.plants = Math.min(
        100,
        Math.round((userProgress.plantCount / community.avgPlantsPerUser) * 50)
      );
    }

    return {
      user: userProgress,
      community,
      percentiles,
    };
  }),
});

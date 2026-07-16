import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import {
  ALL_ACHIEVEMENTS,
  GROUP_LABELS,
  evaluateAchievements,
  getAchievementProgress,
} from "@/server/lib/achievements";

export const achievementsRouter = createTRPCRouter({
  /** All achievements with unlock status + progress */
  list: protectedProcedure.query(async ({ ctx }) => {
    const [unlocked, progress] = await Promise.all([
      ctx.db.userAchievement.findMany({
        where: { userId: ctx.user.id },
        select: { type: true, unlockedAt: true },
      }),
      getAchievementProgress(ctx.user.id, ctx.db),
    ]);

    const unlockedMap = new Map(
      unlocked.map((a) => [a.type, a.unlockedAt])
    );

    return {
      achievements: ALL_ACHIEVEMENTS.map((def) => ({
        type: def.type,
        label: def.label,
        description: def.description,
        icon: def.icon,
        group: def.group,
        threshold: def.threshold,
        unlockedAt: unlockedMap.get(def.type as never)?.toISOString() ?? null,
      })),
      progress,
      groupLabels: GROUP_LABELS,
    };
  }),

  /** Force check achievements (called after key actions from client) */
  check: protectedProcedure.mutation(async ({ ctx }) => {
    return evaluateAchievements(ctx.user.id, ctx.db);
  }),
});

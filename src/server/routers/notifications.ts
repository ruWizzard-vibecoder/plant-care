import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const notificationsRouter = createTRPCRouter({
  getPrefs: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await ctx.db.notificationPrefs.findUnique({
      where: { userId: ctx.user.id },
    });
    return prefs ?? {
      waterEnabled: true,
      fertilizeEnabled: true,
      repotEnabled: true,
      reminderHour: 9,
      reminderTzOffset: new Date().getTimezoneOffset(),
      achievementsEnabled: true,
      communityEnabled: true,
      friendActivityEnabled: true,
    };
  }),

  updatePrefs: protectedProcedure
    .input(
      z.object({
        waterEnabled: z.boolean().optional(),
        fertilizeEnabled: z.boolean().optional(),
        repotEnabled: z.boolean().optional(),
        reminderHour: z.number().min(0).max(23).optional(),
        reminderTzOffset: z.number().optional(),
        achievementsEnabled: z.boolean().optional(),
        communityEnabled: z.boolean().optional(),
        friendActivityEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.notificationPrefs.upsert({
        where: { userId: ctx.user.id },
        create: { userId: ctx.user.id, ...input },
        update: input,
      });
    }),
});

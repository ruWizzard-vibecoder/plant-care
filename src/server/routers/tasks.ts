import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { addDays } from "date-fns";

export const tasksRouter = createTRPCRouter({
  todayTasks: protectedProcedure.query(async ({ ctx }) => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return ctx.db.careTask.findMany({
      where: {
        plant: { userId: ctx.user.id, isArchived: false },
        isActive: true,
        nextDueAt: { lte: endOfToday },
      },
      include: {
        plant: {
          include: {
            species: { select: { commonNameRu: true, thumbnailUrl: true } },
            photos: { where: { isCover: true }, take: 1 },
          },
        },
      },
      orderBy: [{ type: "asc" }, { nextDueAt: "asc" }],
    });
  }),

  complete: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        note: z.string().optional(),
        amount: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.careTask.findUniqueOrThrow({
        where: { id: input.taskId },
        include: { plant: { select: { userId: true } } },
      });

      if (task.plant.userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      const nextDue = addDays(new Date(), task.frequencyDays);

      const [log] = await ctx.db.$transaction([
        ctx.db.careLog.create({
          data: {
            taskId: task.id,
            plantId: task.plantId,
            type: task.type,
            note: input.note,
            amount: input.amount,
          },
        }),
        ctx.db.careTask.update({
          where: { id: task.id },
          data: { nextDueAt: nextDue },
        }),
      ]);

      return { success: true, nextDueAt: nextDue, logId: log.id };
    }),

  calendarRange: protectedProcedure
    .input(z.object({ from: z.date(), to: z.date() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.careTask.findMany({
        where: {
          plant: { userId: ctx.user.id, isArchived: false },
          isActive: true,
          nextDueAt: { gte: input.from, lte: input.to },
        },
        include: {
          plant: {
            select: {
              id: true,
              nickname: true,
              species: { select: { commonNameRu: true } },
              photos: { where: { isCover: true }, take: 1 },
            },
          },
        },
      });
    }),
});

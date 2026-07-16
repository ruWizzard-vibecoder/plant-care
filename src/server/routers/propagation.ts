import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { evaluateAchievements } from "@/server/lib/achievements";

const METHOD_LABELS: Record<string, string> = {
  STEM_CUTTING: "Стеблевой черенок",
  LEAF_CUTTING: "Листовой черенок",
  DIVISION: "Деление куста",
  AIR_LAYERING: "Воздушная отводка",
  WATER_ROOTING: "Укоренение в воде",
  SEEDS: "Семена",
  OTHER: "Другое",
};

const STATUS_LABELS: Record<string, string> = {
  STARTED: "Начато",
  ROOTING: "Укореняется",
  ROOTED: "Укоренилось",
  PLANTED: "Посажено",
  FAILED: "Не прижилось",
};

const methods = ["STEM_CUTTING", "LEAF_CUTTING", "DIVISION", "AIR_LAYERING", "WATER_ROOTING", "SEEDS", "OTHER"] as const;
const statuses = ["STARTED", "ROOTING", "ROOTED", "PLANTED", "FAILED"] as const;

export { METHOD_LABELS, STATUS_LABELS };

export const propagationRouter = createTRPCRouter({
  /** List propagations for a plant */
  listByPlant: protectedProcedure
    .input(z.object({ plantId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.propagation.findMany({
        where: {
          parentPlantId: input.plantId,
          parentPlant: { userId: ctx.user.id },
        },
        include: {
          childPlant: { select: { id: true, nickname: true, customName: true } },
        },
        orderBy: { startedAt: "desc" },
      });
    }),

  /** Create a new propagation */
  create: protectedProcedure
    .input(
      z.object({
        parentPlantId: z.string(),
        method: z.enum(methods),
        note: z.string().max(500).optional(),
        startedAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const plant = await ctx.db.userPlant.findFirst({
        where: { id: input.parentPlantId, userId: ctx.user.id },
      });
      if (!plant) throw new Error("Plant not found");

      const propagation = await ctx.db.propagation.create({
        data: {
          parentPlantId: input.parentPlantId,
          method: input.method,
          note: input.note,
          startedAt: input.startedAt ? new Date(input.startedAt) : new Date(),
        },
      });

      // Check achievements (non-blocking)
      evaluateAchievements(ctx.user.id, ctx.db).catch(() => {});

      return propagation;
    }),

  /** Update status of a propagation */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(statuses),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership through parent plant
      const prop = await ctx.db.propagation.findFirst({
        where: { id: input.id, parentPlant: { userId: ctx.user.id } },
      });
      if (!prop) throw new Error("Propagation not found");

      const data: Record<string, unknown> = { status: input.status };
      if (input.note !== undefined) data.note = input.note;

      // Set timestamp based on status
      if (input.status === "ROOTED" && !prop.rootedAt) {
        data.rootedAt = new Date();
      }
      if (input.status === "PLANTED" && !prop.plantedAt) {
        data.plantedAt = new Date();
      }

      const updated = await ctx.db.propagation.update({
        where: { id: input.id },
        data,
      });

      // Check achievements (non-blocking)
      evaluateAchievements(ctx.user.id, ctx.db).catch(() => {});

      return updated;
    }),

  /** Delete a propagation */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const prop = await ctx.db.propagation.findFirst({
        where: { id: input.id, parentPlant: { userId: ctx.user.id } },
      });
      if (!prop) throw new Error("Propagation not found");

      return ctx.db.propagation.delete({ where: { id: input.id } });
    }),
});

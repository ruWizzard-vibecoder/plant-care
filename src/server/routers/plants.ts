import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { evaluateAchievements } from "@/server/lib/achievements";

export const plantsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.userPlant.findMany({
      where: { userId: ctx.user.id, isArchived: false },
      include: {
        species: true,
        room: true,
        photos: { where: { isCover: true }, take: 1 },
        careTasks: {
          where: { isActive: true },
          orderBy: { nextDueAt: "asc" },
          take: 1,
        },
      },
      orderBy: [{ isFavorite: "desc" }, { createdAt: "desc" }],
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.userPlant.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.user.id },
        include: {
          species: { include: { catalogPhotos: true } },
          photos: { orderBy: { takenAt: "desc" } },
          careTasks: { where: { isActive: true }, orderBy: { nextDueAt: "asc" } },
          careLogs: { orderBy: { doneAt: "desc" }, take: 30 },
          growthRecords: { orderBy: { recordedAt: "desc" }, take: 10 },
          room: true,
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        speciesId: z.string().optional(),
        customName: z.string().optional(),
        nickname: z.string().optional(),
        roomId: z.string().optional(),
        acquiredAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plant = await ctx.db.userPlant.create({
        data: { ...input, userId: ctx.user.id },
      });

      if (input.speciesId) {
        const species = await ctx.db.plantSpecies.findUnique({
          where: { id: input.speciesId },
        });
        if (species) {
          await ctx.db.careTask.createMany({
            data: [
              {
                plantId: plant.id,
                type: "WATER",
                frequencyDays: species.wateringFreqDays,
                nextDueAt: new Date(),
              },
              {
                plantId: plant.id,
                type: "FERTILIZE",
                frequencyDays: species.fertilizingFreqDays,
                nextDueAt: new Date(),
              },
            ],
          });
        }
      }

      // Check achievements (non-blocking)
      evaluateAchievements(ctx.user.id, ctx.db).catch(() => {});

      return plant;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nickname: z.string().nullable().optional(),
        roomId: z.string().nullable().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.userPlant.update({
        where: { id, userId: ctx.user.id },
        data,
      });
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userPlant.update({
        where: { id: input.id, userId: ctx.user.id },
        data: { isArchived: true },
      });
    }),

  batchArchive: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userPlant.updateMany({
        where: { id: { in: input.ids }, userId: ctx.user.id },
        data: { isArchived: true },
      });
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.db.userPlant.findUniqueOrThrow({
        where: { id: input.id, userId: ctx.user.id },
      });

      const plant = await ctx.db.userPlant.create({
        data: {
          userId: ctx.user.id,
          speciesId: source.speciesId,
          roomId: source.roomId,
          nickname: source.nickname ? `${source.nickname} (копия)` : null,
          customName: source.customName,
          notes: source.notes,
        },
      });

      if (source.speciesId) {
        const species = await ctx.db.plantSpecies.findUnique({
          where: { id: source.speciesId },
        });
        if (species) {
          await ctx.db.careTask.createMany({
            data: [
              {
                plantId: plant.id,
                type: "WATER",
                frequencyDays: species.wateringFreqDays,
                nextDueAt: new Date(),
              },
              {
                plantId: plant.id,
                type: "FERTILIZE",
                frequencyDays: species.fertilizingFreqDays,
                nextDueAt: new Date(),
              },
            ],
          });
        }
      }

      return plant;
    }),

  addPhoto: protectedProcedure
    .input(
      z.object({
        plantId: z.string(),
        url: z.string(),
        isCover: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.userPlant.findUniqueOrThrow({
        where: { id: input.plantId, userId: ctx.user.id },
      });

      if (input.isCover) {
        await ctx.db.plantPhoto.updateMany({
          where: { plantId: input.plantId, isCover: true },
          data: { isCover: false },
        });
      }

      const existingCount = await ctx.db.plantPhoto.count({
        where: { plantId: input.plantId },
      });

      const photo = await ctx.db.plantPhoto.create({
        data: {
          plantId: input.plantId,
          url: input.url,
          isCover: input.isCover ?? existingCount === 0,
        },
      });

      // Check achievements (non-blocking)
      evaluateAchievements(ctx.user.id, ctx.db).catch(() => {});

      return photo;
    }),

  deletePhoto: protectedProcedure
    .input(z.object({ photoId: z.string(), plantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.userPlant.findUniqueOrThrow({
        where: { id: input.plantId, userId: ctx.user.id },
      });
      // Scope by both photoId AND plantId so a photo can only be deleted via
      // the plant that actually owns it (prevents cross-plant photo deletion).
      const res = await ctx.db.plantPhoto.deleteMany({
        where: { id: input.photoId, plantId: input.plantId },
      });
      if (res.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Фото не найдено" });
      }
      return { success: true };
    }),

  setCoverPhoto: protectedProcedure
    .input(z.object({ photoId: z.string(), plantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.userPlant.findUniqueOrThrow({
        where: { id: input.plantId, userId: ctx.user.id },
      });
      // Ensure the target photo actually belongs to this plant before mutating.
      const res = await ctx.db.plantPhoto.updateMany({
        where: { id: input.photoId, plantId: input.plantId },
        data: { isCover: true },
      });
      if (res.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Фото не найдено" });
      }
      await ctx.db.plantPhoto.updateMany({
        where: { plantId: input.plantId, isCover: true, id: { not: input.photoId } },
        data: { isCover: false },
      });
      return { success: true };
    }),

  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const plant = await ctx.db.userPlant.findFirstOrThrow({
        where: { id: input.id, userId: ctx.user.id },
      });
      return ctx.db.userPlant.update({
        where: { id: input.id },
        data: { isFavorite: !plant.isFavorite },
      });
    }),
});

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { evaluateAchievements } from "@/server/lib/achievements";

export const wishlistRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        sort: z.enum(["date", "priority", "name"]).default("date"),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const orderBy =
        input.sort === "priority"
          ? { priority: "desc" as const }
          : input.sort === "name"
            ? { species: { commonNameRu: "asc" as const } }
            : { createdAt: "desc" as const };

      return ctx.db.wishlistItem.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.priority ? { priority: input.priority } : {}),
        },
        include: {
          species: {
            select: {
              id: true,
              commonNameRu: true,
              scientificName: true,
              thumbnailUrl: true,
              imageUrl: true,
              waterNeed: true,
              lightNeed: true,
              humidityNeed: true,
              category: true,
              toxicToPets: true,
              toxicToHumans: true,
            },
          },
        },
        orderBy,
      });
    }),

  count: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.wishlistItem.count({ where: { userId: ctx.user.id } });
  }),

  isInWishlist: protectedProcedure
    .input(z.object({ speciesId: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.wishlistItem.findUnique({
        where: {
          userId_speciesId: {
            userId: ctx.user.id,
            speciesId: input.speciesId,
          },
        },
        select: { id: true },
      });
      return !!item;
    }),

  add: protectedProcedure
    .input(
      z.object({
        speciesId: z.string().optional(),
        customName: z.string().optional(),
        note: z.string().max(500).optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
        price: z.number().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.speciesId && !input.customName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Укажите вид растения или название",
        });
      }

      if (input.speciesId) {
        const existing = await ctx.db.wishlistItem.findUnique({
          where: {
            userId_speciesId: {
              userId: ctx.user.id,
              speciesId: input.speciesId,
            },
          },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Растение уже в списке желаний",
          });
        }
      }

      const item = await ctx.db.wishlistItem.create({
        data: {
          userId: ctx.user.id,
          speciesId: input.speciesId,
          customName: input.customName,
          note: input.note,
          priority: input.priority,
          price: input.price,
        },
      });

      evaluateAchievements(ctx.user.id, ctx.db).catch(() => {});
      return item;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.wishlistItem.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.wishlistItem.delete({ where: { id: input.id } });
    }),

  toggle: protectedProcedure
    .input(z.object({ speciesId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.wishlistItem.findUnique({
        where: {
          userId_speciesId: {
            userId: ctx.user.id,
            speciesId: input.speciesId,
          },
        },
      });
      if (existing) {
        await ctx.db.wishlistItem.delete({ where: { id: existing.id } });
        return { added: false };
      }
      await ctx.db.wishlistItem.create({
        data: { userId: ctx.user.id, speciesId: input.speciesId },
      });
      evaluateAchievements(ctx.user.id, ctx.db).catch(() => {});
      return { added: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        note: z.string().max(500).nullable().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
        price: z.number().positive().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const item = await ctx.db.wishlistItem.findFirst({
        where: { id, userId: ctx.user.id },
      });
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db.wishlistItem.update({ where: { id }, data });
    }),

  moveToGarden: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nickname: z.string().optional(),
        roomId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.wishlistItem.findFirst({
        where: { id: input.id, userId: ctx.user.id },
        include: { species: true },
      });
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const plant = await ctx.db.userPlant.create({
        data: {
          userId: ctx.user.id,
          speciesId: item.speciesId,
          customName: item.customName,
          nickname: input.nickname,
          roomId: input.roomId,
        },
      });

      if (item.species) {
        await ctx.db.careTask.createMany({
          data: [
            {
              plantId: plant.id,
              type: "WATER",
              frequencyDays: item.species.wateringFreqDays,
              nextDueAt: new Date(),
            },
            {
              plantId: plant.id,
              type: "FERTILIZE",
              frequencyDays: item.species.fertilizingFreqDays,
              nextDueAt: new Date(),
            },
          ],
        });
      }

      await ctx.db.wishlistItem.delete({ where: { id: input.id } });
      evaluateAchievements(ctx.user.id, ctx.db).catch(() => {});
      return plant;
    }),

  friendWishlist: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .query(async ({ ctx, input }) => {
      const friendship = await ctx.db.friendship.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: ctx.user.id, addresseeId: input.friendId },
            { requesterId: input.friendId, addresseeId: ctx.user.id },
          ],
        },
      });
      if (!friendship) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Вы не друзья" });
      }

      const friend = await ctx.db.user.findUnique({
        where: { id: input.friendId },
        select: { id: true, name: true, image: true, shareWishlist: true },
      });
      if (!friend) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (!friend.shareWishlist) {
        return { friend, items: [] as never[], hidden: true, currentUserId: ctx.user.id };
      }

      const items = await ctx.db.wishlistItem.findMany({
        where: { userId: input.friendId },
        include: {
          species: {
            select: {
              id: true,
              commonNameRu: true,
              scientificName: true,
              thumbnailUrl: true,
              imageUrl: true,
              category: true,
            },
          },
          reservedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });

      return { friend, items, hidden: false, currentUserId: ctx.user.id };
    }),

  toggleReservation: protectedProcedure
    .input(z.object({ itemId: z.string(), friendId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const friendship = await ctx.db.friendship.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: ctx.user.id, addresseeId: input.friendId },
            { requesterId: input.friendId, addresseeId: ctx.user.id },
          ],
        },
      });
      if (!friendship) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const item = await ctx.db.wishlistItem.findFirst({
        where: { id: input.itemId, userId: input.friendId },
      });
      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (item.reservedByUserId === ctx.user.id) {
        await ctx.db.wishlistItem.update({
          where: { id: input.itemId },
          data: { reservedByUserId: null },
        });
        return { reserved: false };
      }

      if (item.reservedByUserId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Этот подарок уже зарезервирован",
        });
      }

      await ctx.db.wishlistItem.update({
        where: { id: input.itemId },
        data: { reservedByUserId: ctx.user.id },
      });
      return { reserved: true };
    }),
});

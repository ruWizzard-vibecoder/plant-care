import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const friendsRouter = createTRPCRouter({
  /** List accepted friends with mini-stats */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const friendships = await ctx.db.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, name: true, email: true, image: true, shareCollection: true, shareAchievements: true } },
        addressee: { select: { id: true, name: true, email: true, image: true, shareCollection: true, shareAchievements: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // For each friend, get plant count
    const friends = await Promise.all(
      friendships.map(async (f) => {
        const friend = f.requesterId === userId ? f.addressee : f.requester;
        const plantCount = await ctx.db.userPlant.count({
          where: { userId: friend.id, isArchived: false },
        });
        const achievementCount = await ctx.db.userAchievement.count({
          where: { userId: friend.id },
        });
        return {
          friendshipId: f.id,
          id: friend.id,
          name: friend.name,
          email: friend.email,
          image: friend.image,
          shareCollection: friend.shareCollection,
          shareAchievements: friend.shareAchievements,
          plantCount,
          achievementCount,
        };
      })
    );

    return friends;
  }),

  /** Incoming friend requests */
  pendingRequests: protectedProcedure.query(async ({ ctx }) => {
    const requests = await ctx.db.friendship.findMany({
      where: { addresseeId: ctx.user.id, status: "PENDING" },
      include: {
        requester: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return requests.map((r) => ({
      friendshipId: r.id,
      from: r.requester,
      createdAt: r.createdAt.toISOString(),
    }));
  }),

  /** Count pending requests (for badge) */
  pendingCount: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.friendship.count({
      where: { addresseeId: ctx.user.id, status: "PENDING" },
    });
  }),

  /** Send friend request by email */
  sendRequest: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Find user by email
      const target = await ctx.db.user.findUnique({
        where: { email: input.email.toLowerCase() },
        select: { id: true, name: true },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Пользователь с таким email не найден" });
      }
      if (target.id === userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Нельзя добавить себя в друзья" });
      }

      // Check for existing friendship (in either direction)
      const existing = await ctx.db.friendship.findFirst({
        where: {
          OR: [
            { requesterId: userId, addresseeId: target.id },
            { requesterId: target.id, addresseeId: userId },
          ],
        },
      });
      if (existing) {
        if (existing.status === "ACCEPTED") {
          throw new TRPCError({ code: "CONFLICT", message: "Вы уже друзья" });
        }
        if (existing.status === "PENDING") {
          throw new TRPCError({ code: "CONFLICT", message: "Заявка уже отправлена" });
        }
        if (existing.status === "BLOCKED") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Невозможно отправить заявку" });
        }
      }

      await ctx.db.friendship.create({
        data: {
          requesterId: userId,
          addresseeId: target.id,
          status: "PENDING",
        },
      });

      return { success: true, name: target.name };
    }),

  /** Respond to friend request */
  respond: protectedProcedure
    .input(
      z.object({
        friendshipId: z.string(),
        action: z.enum(["accept", "reject", "block"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const friendship = await ctx.db.friendship.findFirst({
        where: { id: input.friendshipId, addresseeId: ctx.user.id, status: "PENDING" },
      });
      if (!friendship) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Заявка не найдена" });
      }

      if (input.action === "reject") {
        await ctx.db.friendship.delete({ where: { id: input.friendshipId } });
        return { status: "rejected" };
      }

      const newStatus = input.action === "accept" ? "ACCEPTED" : "BLOCKED";
      await ctx.db.friendship.update({
        where: { id: input.friendshipId },
        data: { status: newStatus as never },
      });

      return { status: newStatus.toLowerCase() };
    }),

  /** Remove friend */
  remove: protectedProcedure
    .input(z.object({ friendshipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const friendship = await ctx.db.friendship.findFirst({
        where: {
          id: input.friendshipId,
          OR: [{ requesterId: ctx.user.id }, { addresseeId: ctx.user.id }],
        },
      });
      if (!friendship) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Дружба не найдена" });
      }

      await ctx.db.friendship.delete({ where: { id: input.friendshipId } });
      return { success: true };
    }),

  /** View friend's garden (plants collection) */
  friendGarden: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify friendship
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

      // Check privacy
      const friend = await ctx.db.user.findUnique({
        where: { id: input.friendId },
        select: { id: true, name: true, image: true, shareCollection: true, shareAchievements: true },
      });
      if (!friend) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (!friend.shareCollection) {
        return { friend, plants: [], hidden: true };
      }

      const plants = await ctx.db.userPlant.findMany({
        where: { userId: input.friendId, isArchived: false },
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
              category: true,
            },
          },
          photos: {
            where: { isCover: true },
            take: 1,
            select: { url: true },
          },
          room: { select: { name: true } },
          _count: { select: { careLogs: true, growthRecords: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return { friend, plants, hidden: false };
    }),

  /** View friend's achievements */
  friendAchievements: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify friendship
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
        select: { shareAchievements: true },
      });
      if (!friend?.shareAchievements) {
        return { achievements: [], hidden: true };
      }

      const achievements = await ctx.db.userAchievement.findMany({
        where: { userId: input.friendId },
        select: { type: true, unlockedAt: true },
        orderBy: { unlockedAt: "desc" },
      });

      return {
        achievements: achievements.map((a) => ({
          type: a.type,
          unlockedAt: a.unlockedAt.toISOString(),
        })),
        hidden: false,
      };
    }),

  /** Compare growth of two plants (mine vs friend's) */
  compareGrowth: protectedProcedure
    .input(
      z.object({
        myPlantId: z.string(),
        friendPlantId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify my plant
      const myPlant = await ctx.db.userPlant.findFirst({
        where: { id: input.myPlantId, userId: ctx.user.id },
        include: {
          species: { select: { commonNameRu: true, scientificName: true } },
          photos: { where: { isCover: true }, take: 1, select: { url: true } },
        },
      });
      if (!myPlant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Растение не найдено" });
      }

      // Verify friend's plant + friendship + privacy
      const friendPlant = await ctx.db.userPlant.findUnique({
        where: { id: input.friendPlantId },
        include: {
          user: { select: { id: true, name: true, shareCollection: true } },
          species: { select: { commonNameRu: true, scientificName: true } },
          photos: { where: { isCover: true }, take: 1, select: { url: true } },
        },
      });
      if (!friendPlant || !friendPlant.user.shareCollection) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const friendship = await ctx.db.friendship.findFirst({
        where: {
          status: "ACCEPTED",
          OR: [
            { requesterId: ctx.user.id, addresseeId: friendPlant.user.id },
            { requesterId: friendPlant.user.id, addresseeId: ctx.user.id },
          ],
        },
      });
      if (!friendship) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Fetch growth records for both
      const [myRecords, friendRecords] = await Promise.all([
        ctx.db.growthRecord.findMany({
          where: { plantId: input.myPlantId },
          orderBy: { recordedAt: "asc" },
          select: { recordedAt: true, heightCm: true, diameterCm: true, leafCount: true },
        }),
        ctx.db.growthRecord.findMany({
          where: { plantId: input.friendPlantId },
          orderBy: { recordedAt: "asc" },
          select: { recordedAt: true, heightCm: true, diameterCm: true, leafCount: true },
        }),
      ]);

      // Calculate growth stats
      const calcGrowthPct = (records: { heightCm: number | null }[]) => {
        const heights = records.filter((r) => r.heightCm != null);
        if (heights.length < 2) return null;
        const first = heights[0].heightCm!;
        const last = heights[heights.length - 1].heightCm!;
        return first > 0 ? Math.round(((last - first) / first) * 100) : null;
      };

      // Care log counts
      const [myCareCount, friendCareCount] = await Promise.all([
        ctx.db.careLog.count({ where: { plantId: input.myPlantId } }),
        ctx.db.careLog.count({ where: { plantId: input.friendPlantId } }),
      ]);

      return {
        myPlant: {
          name: myPlant.nickname ?? myPlant.customName ?? myPlant.species?.commonNameRu ?? "Растение",
          species: myPlant.species?.scientificName,
          photo: myPlant.photos[0]?.url ?? null,
          records: myRecords,
          growthPct: calcGrowthPct(myRecords),
          careCount: myCareCount,
        },
        friendPlant: {
          name: friendPlant.nickname ?? friendPlant.customName ?? friendPlant.species?.commonNameRu ?? "Растение",
          species: friendPlant.species?.scientificName,
          photo: friendPlant.photos[0]?.url ?? null,
          ownerName: friendPlant.user.name,
          records: friendRecords,
          growthPct: calcGrowthPct(friendRecords),
          careCount: friendCareCount,
        },
      };
    }),

  /** Get current user's privacy settings */
  privacySettings: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: { shareCollection: true, shareAchievements: true, shareWishlist: true },
    });
    return user ?? { shareCollection: true, shareAchievements: true, shareWishlist: true };
  }),

  /** Update privacy settings */
  updatePrivacy: protectedProcedure
    .input(
      z.object({
        shareCollection: z.boolean().optional(),
        shareAchievements: z.boolean().optional(),
        shareWishlist: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.user.id },
        data: input,
        select: { shareCollection: true, shareAchievements: true, shareWishlist: true },
      });
    }),

  /** Activity feed from friends */
  activityFeed: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // Get friend IDs
    const friendships = await ctx.db.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });
    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );

    if (friendIds.length === 0) return [];

    // Fetch recent events from friends (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const [newPlants, newAchievements, newPropagations] = await Promise.all([
      // New plants
      ctx.db.userPlant.findMany({
        where: { userId: { in: friendIds }, createdAt: { gte: weekAgo }, isArchived: false },
        include: {
          user: { select: { id: true, name: true, shareCollection: true } },
          species: { select: { commonNameRu: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // New achievements
      ctx.db.userAchievement.findMany({
        where: { userId: { in: friendIds }, unlockedAt: { gte: weekAgo } },
        include: {
          user: { select: { id: true, name: true, shareAchievements: true } },
        },
        orderBy: { unlockedAt: "desc" },
        take: 10,
      }),
      // New propagations
      ctx.db.propagation.findMany({
        where: {
          parentPlant: { userId: { in: friendIds } },
          createdAt: { gte: weekAgo },
        },
        include: {
          parentPlant: {
            include: {
              user: { select: { id: true, name: true, shareCollection: true } },
              species: { select: { commonNameRu: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Combine and sort
    type FeedItem = {
      type: "plant" | "achievement" | "propagation";
      date: string;
      userId: string;
      userName: string;
      detail: string;
    };

    const feed: FeedItem[] = [];

    for (const p of newPlants) {
      if (!p.user.shareCollection) continue;
      feed.push({
        type: "plant",
        date: p.createdAt.toISOString(),
        userId: p.user.id,
        userName: p.user.name,
        detail: p.species?.commonNameRu ?? p.customName ?? "новое растение",
      });
    }

    for (const a of newAchievements) {
      if (!a.user.shareAchievements) continue;
      feed.push({
        type: "achievement",
        date: a.unlockedAt.toISOString(),
        userId: a.user.id,
        userName: a.user.name,
        detail: a.type,
      });
    }

    for (const pr of newPropagations) {
      if (!pr.parentPlant.user.shareCollection) continue;
      feed.push({
        type: "propagation",
        date: pr.createdAt.toISOString(),
        userId: pr.parentPlant.user.id,
        userName: pr.parentPlant.user.name,
        detail: pr.parentPlant.species?.commonNameRu ?? "растение",
      });
    }

    // Sort by date desc, take 20
    feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return feed.slice(0, 20);
  }),
});

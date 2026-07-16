/**
 * Push notification sender.
 * Called by /api/cron/notify — checks recommendations for all users
 * with active push subscriptions and sends reminders for overdue/soon items.
 */

import { db } from "@/server/db";
import { calculateRecommendations } from "./recommendations";
import { sendPushNotification, type PushPayload } from "@/lib/push";
import { ALL_ACHIEVEMENTS } from "./achievements";

const URGENCY_EMOJI: Record<string, string> = {
  overdue: "🚨",
  soon: "⏰",
};

const TYPE_EMOJI: Record<string, string> = {
  WATER: "💧",
  SPRAY: "🌫️",
  FERTILIZE_MINERAL: "🧪",
  FERTILIZE_ORGANIC: "🌱",
  REPOT: "🪴",
};

const TYPE_VERB: Record<string, string> = {
  WATER: "полить",
  SPRAY: "опрыскать",
  FERTILIZE_MINERAL: "удобрить (мин.)",
  FERTILIZE_ORGANIC: "удобрить (орг.)",
  REPOT: "пересадить",
};

/** Maps care type to NotificationPrefs field */
function isTypeEnabled(
  type: string,
  prefs: { waterEnabled: boolean; fertilizeEnabled: boolean; repotEnabled: boolean }
): boolean {
  switch (type) {
    case "WATER":
    case "SPRAY":
      return prefs.waterEnabled;
    case "FERTILIZE_MINERAL":
    case "FERTILIZE_ORGANIC":
      return prefs.fertilizeEnabled;
    case "REPOT":
      return prefs.repotEnabled;
    default:
      return false;
  }
}

export async function sendScheduledNotifications(): Promise<{
  usersChecked: number;
  notificationsSent: number;
  subscriptionsCleaned: number;
}> {
  const now = new Date();
  let notificationsSent = 0;
  let subscriptionsCleaned = 0;

  // Get all users who have push subscriptions
  const usersWithSubs = await db.pushSubscription.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  const userIds = usersWithSubs.map((s) => s.userId);
  if (userIds.length === 0) {
    return { usersChecked: 0, notificationsSent: 0, subscriptionsCleaned: 0 };
  }

  for (const userId of userIds) {
    try {
      // Check user's notification preferences
      const prefs = await db.notificationPrefs.findUnique({
        where: { userId },
      });
      const effectivePrefs = prefs ?? {
        waterEnabled: true,
        fertilizeEnabled: true,
        repotEnabled: true,
        reminderHour: 9,
        reminderTzOffset: 0,
      };

      // Check if it's the right hour for this user
      const userHour = (now.getUTCHours() - Math.round(effectivePrefs.reminderTzOffset / -60) + 24) % 24;
      if (userHour !== effectivePrefs.reminderHour) {
        continue;
      }

      // Fetch user's active plants with species, room, and recent logs
      const plants = await db.userPlant.findMany({
        where: { userId, isArchived: false },
        include: {
          species: true,
          room: true,
          photos: { where: { isCover: true }, take: 1 },
          careLogs: { orderBy: { doneAt: "desc" }, take: 50 },
        },
      });

      if (plants.length === 0) continue;

      // Calculate recommendations for all plants
      const urgent: { plantName: string; type: string; urgency: string }[] = [];

      for (const plant of plants) {
        const recs = calculateRecommendations(
          {
            ...plant,
            species: plant.species,
            room: plant.room,
            photos: plant.photos,
          },
          plant.careLogs,
          now
        );

        for (const rec of recs) {
          if (
            (rec.urgency === "overdue" || rec.urgency === "soon") &&
            isTypeEnabled(rec.type, effectivePrefs)
          ) {
            urgent.push({
              plantName: rec.plantName,
              type: rec.type,
              urgency: rec.urgency,
            });
          }
        }
      }

      if (urgent.length === 0) continue;

      // Build notification payload
      const overdueCount = urgent.filter((u) => u.urgency === "overdue").length;
      const soonCount = urgent.filter((u) => u.urgency === "soon").length;

      let title: string;
      if (overdueCount > 0 && soonCount > 0) {
        title = `${URGENCY_EMOJI.overdue} ${overdueCount} просрочено, ${soonCount} скоро`;
      } else if (overdueCount > 0) {
        title = `${URGENCY_EMOJI.overdue} ${overdueCount} действий просрочено`;
      } else {
        title = `${URGENCY_EMOJI.soon} ${soonCount} растений ждут ухода`;
      }

      // Show top 3 items in body
      const lines = urgent.slice(0, 3).map((u) => {
        const emoji = TYPE_EMOJI[u.type] ?? "🌿";
        const verb = TYPE_VERB[u.type] ?? u.type;
        return `${emoji} ${u.plantName} — ${verb}`;
      });
      if (urgent.length > 3) {
        lines.push(`...и ещё ${urgent.length - 3}`);
      }

      const payload: PushPayload = {
        title,
        body: lines.join("\n"),
        url: "/dashboard",
      };

      // Send to all user's subscriptions
      const subscriptions = await db.pushSubscription.findMany({
        where: { userId },
      });

      for (const sub of subscriptions) {
        try {
          await sendPushNotification(sub, payload);
          notificationsSent++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          // 404 or 410 means subscription expired — clean up
          if (status === 404 || status === 410) {
            await db.pushSubscription.delete({ where: { id: sub.id } });
            subscriptionsCleaned++;
          } else {
            console.error(`[Notify] Failed to send to ${sub.endpoint.slice(0, 60)}...`, err);
          }
        }
      }
      // === Achievement notifications ===
      const achievementsEnabled = prefs?.achievementsEnabled ?? true;
      if (achievementsEnabled) {
        const newAchievements = await db.userAchievement.findMany({
          where: { userId, notified: false },
        });

        if (newAchievements.length > 0) {
          const achievementDef = ALL_ACHIEVEMENTS.find(
            (a) => a.type === newAchievements[0].type
          );
          const label = achievementDef
            ? `${achievementDef.icon} ${achievementDef.label}`
            : "Новое достижение";

          const achPayload: PushPayload = {
            title: "🏆 Новое достижение!",
            body:
              newAchievements.length === 1
                ? label
                : `${label} и ещё ${newAchievements.length - 1}`,
            url: "/achievements",
          };

          const subs = await db.pushSubscription.findMany({ where: { userId } });
          for (const sub of subs) {
            try {
              await sendPushNotification(sub, achPayload);
              notificationsSent++;
            } catch (err: unknown) {
              const status = (err as { statusCode?: number }).statusCode;
              if (status === 404 || status === 410) {
                await db.pushSubscription.delete({ where: { id: sub.id } });
                subscriptionsCleaned++;
              }
            }
          }

          await db.userAchievement.updateMany({
            where: { id: { in: newAchievements.map((a) => a.id) } },
            data: { notified: true },
          });
        }
      }

      // === Friend activity notifications ===
      const friendActivityEnabled = prefs?.friendActivityEnabled ?? true;
      if (friendActivityEnabled) {
        // Get accepted friends
        const friendships = await db.friendship.findMany({
          where: {
            status: "ACCEPTED",
            OR: [{ requesterId: userId }, { addresseeId: userId }],
          },
          select: { requesterId: true, addresseeId: true },
        });
        const friendIds = friendships.map((f) =>
          f.requesterId === userId ? f.addresseeId : f.requesterId
        );

        if (friendIds.length > 0) {
          const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

          // Friends' new achievements in last hour
          const friendAchievements = await db.userAchievement.findMany({
            where: {
              userId: { in: friendIds },
              unlockedAt: { gte: oneHourAgo },
            },
            include: {
              user: { select: { name: true, shareAchievements: true } },
            },
            take: 5,
          });

          // Friends' new plants in last hour
          const friendPlants = await db.userPlant.findMany({
            where: {
              userId: { in: friendIds },
              createdAt: { gte: oneHourAgo },
              isArchived: false,
            },
            include: {
              user: { select: { name: true, shareCollection: true } },
              species: { select: { commonNameRu: true } },
            },
            take: 5,
          });

          const lines: string[] = [];
          for (const a of friendAchievements) {
            if (!a.user.shareAchievements) continue;
            const def = ALL_ACHIEVEMENTS.find((d) => d.type === a.type);
            lines.push(`${a.user.name} получил(а) ${def?.icon ?? "🏆"} ${def?.label ?? "достижение"}`);
          }
          for (const p of friendPlants) {
            if (!p.user.shareCollection) continue;
            lines.push(`${p.user.name} добавил(а) ${p.species?.commonNameRu ?? p.customName ?? "растение"}`);
          }

          if (lines.length > 0) {
            const friendPayload: PushPayload = {
              title: "👥 Новости от друзей",
              body: lines.slice(0, 3).join("\n") + (lines.length > 3 ? `\n...и ещё ${lines.length - 3}` : ""),
              url: "/friends",
            };

            const subs = await db.pushSubscription.findMany({ where: { userId } });
            for (const sub of subs) {
              try {
                await sendPushNotification(sub, friendPayload);
                notificationsSent++;
              } catch (err: unknown) {
                const status = (err as { statusCode?: number }).statusCode;
                if (status === 404 || status === 410) {
                  await db.pushSubscription.delete({ where: { id: sub.id } });
                  subscriptionsCleaned++;
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`[Notify] Error processing user ${userId}:`, err);
    }
  }

  return {
    usersChecked: userIds.length,
    notificationsSent,
    subscriptionsCleaned,
  };
}

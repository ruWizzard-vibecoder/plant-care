export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Run notification check every hour
    const HOUR_MS = 60 * 60 * 1000;
    setInterval(async () => {
      try {
        const { sendScheduledNotifications } = await import("@/server/lib/notify");
        const result = await sendScheduledNotifications();
        if (result.notificationsSent > 0) {
          console.log("[Cron/Notify]", result);
        }
      } catch (err) {
        console.error("[Cron/Notify] Error:", err);
      }

      // Refresh community stats cache
      try {
        const { refreshCommunityStats } = await import("@/server/lib/community-stats");
        const { db } = await import("@/server/db");
        await refreshCommunityStats(db);
      } catch (err) {
        console.error("[Cron/CommunityStats] Error:", err);
      }
    }, HOUR_MS);
    console.log("[Cron] Notification + community stats scheduler started (every 1h)");

    // Smart home sensor polling (every 10 minutes, uses per-user tokens from DB)
    const TEN_MIN_MS = 10 * 60 * 1000;
    setInterval(async () => {
      try {
        const { pollSensors } = await import("@/server/lib/sensor-poll");
        const result = await pollSensors();
        if (result.updated > 0) {
          console.log("[Cron/Sensor]", result);
        }
      } catch (err) {
        console.error("[Cron/Sensor] Error:", err);
      }
    }, TEN_MIN_MS);
    console.log("[Cron] Smart home sensor polling started (every 10min)");
  }
}

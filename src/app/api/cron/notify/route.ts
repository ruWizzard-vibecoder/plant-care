import { NextRequest, NextResponse } from "next/server";
import { sendScheduledNotifications } from "@/server/lib/notify";

/**
 * Cron endpoint for sending push notifications.
 * Protected by CRON_SECRET token.
 *
 * Call hourly: curl "http://127.0.0.1:3000/api/cron/notify?secret=YOUR_SECRET"
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendScheduledNotifications();
    console.log("[Cron/Notify]", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Cron/Notify]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

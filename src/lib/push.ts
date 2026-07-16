import webpush from "web-push";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const url = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(url, pub, priv);
  vapidConfigured = true;
  return true;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  if (!ensureVapid()) {
    console.warn("[Push] VAPID keys not configured, skipping notification");
    return;
  }

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload)
  );
}

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// --- Push Notifications ---
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; icon?: string; url?: string };
  try {
    data = event.data.json();
  } catch {
    data = { body: event.data.text() };
  }

  const options = {
    body: data.body ?? "",
    icon: data.icon ?? "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url ?? "/tasks",
      dateOfArrival: Date.now(),
    },
    tag: "plant-care-reminder",
  } satisfies NotificationOptions & { vibrate: number[] };

  event.waitUntil(
    self.registration.showNotification(
      data.title ?? "Plant Care",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data?.url as string) ?? "/tasks";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});

serwist.addEventListeners();

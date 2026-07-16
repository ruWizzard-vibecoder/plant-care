import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { getDevices, readDeviceSensors } from "@/server/lib/yandex-iot";

export const smartHomeRouter = createTRPCRouter({
  connection: protectedProcedure.query(async ({ ctx }) => {
    const conn = await ctx.db.smartHomeConnection.findUnique({
      where: { userId: ctx.user.id },
      select: { provider: true, createdAt: true },
    });
    return { connected: !!conn, provider: conn?.provider ?? null };
  }),

  connectUrl: protectedProcedure.query(() => {
    const clientId = process.env.YANDEX_CLIENT_ID;
    if (!clientId) return { url: null };

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/smart-home/yandex/callback`;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "iot:control",
    });

    return { url: `https://oauth.yandex.ru/authorize?${params}` };
  }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.smartHomeConnection.deleteMany({
      where: { userId: ctx.user.id },
    });
    // Clear sensor links for user's rooms
    await ctx.db.room.updateMany({
      where: { userId: ctx.user.id, sensorDeviceId: { not: null } },
      data: { sensorDeviceId: null, tempC: null, humidityPct: null, sensorUpdatedAt: null },
    });
    return { ok: true };
  }),

  devices: protectedProcedure.query(async ({ ctx }) => {
    const conn = await ctx.db.smartHomeConnection.findUnique({
      where: { userId: ctx.user.id },
      select: { accessToken: true },
    });
    if (!conn) {
      return { configured: false, devices: [] as never[] };
    }
    try {
      const devices = await getDevices(conn.accessToken);
      return { configured: true, devices };
    } catch (err) {
      console.error("[SmartHome] Failed to fetch devices:", err);
      return { configured: false, devices: [] as never[] };
    }
  }),

  pollRoom: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.room.findFirstOrThrow({
        where: { id: input.roomId, userId: ctx.user.id },
      });
      if (!room.sensorDeviceId) {
        throw new Error("No sensor device linked to this room");
      }

      const conn = await ctx.db.smartHomeConnection.findUnique({
        where: { userId: ctx.user.id },
        select: { accessToken: true },
      });
      if (!conn) {
        throw new Error("Smart home not connected");
      }

      const reading = await readDeviceSensors(
        room.sensorDeviceId,
        conn.accessToken,
      );

      return ctx.db.room.update({
        where: { id: room.id },
        data: {
          ...(reading.tempC !== null ? { tempC: reading.tempC } : {}),
          ...(reading.humidityPct !== null
            ? { humidityPct: reading.humidityPct }
            : {}),
          sensorUpdatedAt: new Date(),
        },
      });
    }),
});

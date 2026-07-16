import { db } from "@/server/db";
import { readDeviceSensors } from "./yandex-iot";

export async function pollSensors(): Promise<{
  updated: number;
  errors: number;
}> {
  // Find all rooms with sensors, joined with the user's smart home connection
  const rooms = await db.room.findMany({
    where: { sensorDeviceId: { not: null } },
    select: {
      id: true,
      sensorDeviceId: true,
      user: {
        select: {
          smartHome: { select: { accessToken: true } },
        },
      },
    },
  });

  if (rooms.length === 0) return { updated: 0, errors: 0 };

  let updated = 0;
  let errors = 0;

  for (const room of rooms) {
    const token = room.user.smartHome?.accessToken;
    if (!token) continue; // user disconnected smart home

    try {
      const reading = await readDeviceSensors(room.sensorDeviceId!, token);

      await db.room.update({
        where: { id: room.id },
        data: {
          ...(reading.tempC !== null ? { tempC: reading.tempC } : {}),
          ...(reading.humidityPct !== null
            ? { humidityPct: reading.humidityPct }
            : {}),
          sensorUpdatedAt: new Date(),
        },
      });
      updated++;
    } catch (err) {
      console.error(`[Sensor] Failed to poll room ${room.id}:`, err);
      errors++;
    }
  }

  return { updated, errors };
}

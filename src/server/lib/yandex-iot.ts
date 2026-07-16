const YANDEX_IOT_BASE = "https://api.iot.yandex.net/v1.0";

export interface YandexDevice {
  id: string;
  name: string;
  type: string;
  room?: string;
  tempC: number | null;
  humidityPct: number | null;
}

export interface SensorReading {
  tempC: number | null;
  humidityPct: number | null;
}

interface YandexProperty {
  parameters?: { instance?: string };
  state?: { value?: number };
}

interface YandexDeviceRaw {
  id: string;
  name: string;
  type: string;
  room?: string;
  properties?: YandexProperty[];
}

interface YandexUserInfo {
  status: string;
  rooms?: Array<{ id: string; name: string }>;
  devices?: YandexDeviceRaw[];
}

function extractSensors(properties: YandexProperty[]): SensorReading {
  let tempC: number | null = null;
  let humidityPct: number | null = null;

  for (const prop of properties) {
    const instance = prop.parameters?.instance;
    const value = prop.state?.value;
    if (typeof value !== "number") continue;

    if (instance === "temperature") {
      tempC = Math.round(value * 10) / 10;
    } else if (instance === "humidity") {
      humidityPct = Math.round(value);
    }
  }

  return { tempC, humidityPct };
}

export async function getDevices(token: string): Promise<YandexDevice[]> {
  const res = await fetch(`${YANDEX_IOT_BASE}/user/info`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Yandex IoT API error: ${res.status} ${res.statusText}`);
  }

  const data: YandexUserInfo = await res.json();
  if (data.status !== "ok") {
    throw new Error(`Yandex IoT API status: ${data.status}`);
  }

  const roomMap = new Map<string, string>();
  for (const r of data.rooms ?? []) {
    roomMap.set(r.id, r.name);
  }

  return (data.devices ?? [])
    .filter((d) => {
      const props = d.properties ?? [];
      return props.some(
        (p) =>
          p.parameters?.instance === "temperature" ||
          p.parameters?.instance === "humidity",
      );
    })
    .map((d) => {
      const sensors = extractSensors(d.properties ?? []);
      return {
        id: d.id,
        name: d.name,
        type: d.type,
        room: d.room ? roomMap.get(d.room) : undefined,
        ...sensors,
      };
    });
}

export async function readDeviceSensors(
  deviceId: string,
  token: string,
): Promise<SensorReading> {
  const res = await fetch(`${YANDEX_IOT_BASE}/devices/${deviceId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Yandex IoT device error: ${res.status}`);
  }

  const data: YandexDeviceRaw = await res.json();
  return extractSensors(data.properties ?? []);
}

export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const clientId = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("YANDEX_CLIENT_ID and YANDEX_CLIENT_SECRET are required");
  }

  const res = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yandex token exchange failed: ${res.status} ${text}`);
  }

  return res.json();
}

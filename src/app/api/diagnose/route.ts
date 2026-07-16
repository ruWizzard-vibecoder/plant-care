import { NextRequest } from "next/server";
import { ProxyAgent } from "undici";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from "@/server/lib/rate-limit";
import { unlockDiagnosisAchievement } from "@/server/lib/achievements";

function getSeasonRu(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "весна";
  if (month >= 5 && month <= 7) return "лето";
  if (month >= 8 && month <= 10) return "осень";
  return "зима";
}

const PROXY_URL = process.env.HTTPS_PROXY || "";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const VALID_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = (typeof VALID_MEDIA_TYPES)[number];

export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rate limit: 5 per hour (Vision is expensive)
    const rl = checkRateLimit(session.user.id, "diagnose", {
      windowMs: 3_600_000,
      maxRequests: 5,
    });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Parse and validate input
    const body = await req.json();
    const { plantId, image } = body as { plantId?: string; image?: string };

    if (!plantId || typeof plantId !== "string") {
      return new Response(JSON.stringify({ error: "plantId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!image || typeof image !== "string") {
      return new Response(JSON.stringify({ error: "image is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract media type and validate
    const mediaTypeMatch = image.match(/^data:(image\/\w+);base64,/);
    const mediaType = (mediaTypeMatch?.[1] ?? "image/jpeg") as MediaType;
    if (!VALID_MEDIA_TYPES.includes(mediaType)) {
      return new Response(JSON.stringify({ error: "Unsupported image format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate size
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    if (base64Data.length * 0.75 > MAX_IMAGE_BYTES) {
      return new Response(JSON.stringify({ error: "Изображение слишком большое. Максимум 10МБ" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.AI_MODEL || "claude-haiku-4-5-20251001";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch plant data from DB
    const plant = await db.userPlant.findUnique({
      where: { id: plantId, userId: session.user.id },
      include: {
        species: true,
        room: true,
        careLogs: { orderBy: { doneAt: "desc" }, take: 10 },
      },
    });

    if (!plant) {
      return new Response(JSON.stringify({ error: "Plant not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build system prompt
    const plantName = plant.nickname ?? plant.customName ?? plant.species?.commonNameRu ?? "Растение";
    const speciesName = plant.species?.scientificName;
    const season = getSeasonRu();

    let systemPrompt = `Ты — эксперт-фитопатолог и ботаник. Пользователь отправил фото своего растения для диагностики. Проанализируй фото и дай подробную диагностику на русском языке.

Структура ответа:
1. **Общее состояние** — оценка здоровья (отличное / хорошее / требует внимания / критическое)
2. **Обнаруженные проблемы** — конкретные симптомы, если есть (пятна, пожелтение, увядание, вредители и т.д.)
3. **Возможные причины** — почему это могло произойти
4. **Рекомендации** — конкретные шаги для лечения или улучшения состояния
5. **Профилактика** — как предотвратить проблемы в будущем

Если растение выглядит здоровым — скажи это и дай общие советы по поддержанию здоровья.
Используй эмодзи уместно. Будь конкретным и практичным.

Текущее время года: ${season}.`;

    // Plant identity
    systemPrompt += speciesName
      ? `\n\nРастение пользователя: ${plantName} (${speciesName}).`
      : `\n\nРастение пользователя: ${plantName}.`;

    // Species care requirements
    const species = plant.species;
    if (species) {
      const needs: string[] = [];
      if (species.waterNeed) needs.push(`полив: ${species.waterNeed}/5`);
      if (species.lightNeed) needs.push(`свет: ${species.lightNeed}/5`);
      if (species.humidityNeed) needs.push(`влажность: ${species.humidityNeed}/5`);
      if (species.wateringFreqDays) needs.push(`рек. полив каждые ${species.wateringFreqDays} дн.`);
      if (needs.length > 0) {
        systemPrompt += `\nПотребности вида: ${needs.join(", ")}.`;
      }
    }

    // Room conditions
    const room = plant.room;
    if (room) {
      const conditions: string[] = [];
      if (room.name) conditions.push(`комната: ${room.name}`);
      if (room.tempC != null) conditions.push(`температура: ${room.tempC}°C`);
      if (room.humidityPct != null) conditions.push(`влажность: ${room.humidityPct}%`);
      if (conditions.length > 0) {
        systemPrompt += `\nУсловия содержания: ${conditions.join(", ")}.`;
      }
    }

    // Recent care history
    if (plant.careLogs.length > 0) {
      const typeLabels: Record<string, string> = {
        WATER: "полив",
        SPRAY: "опрыскивание",
        FERTILIZE_MINERAL: "мин. удобрение",
        FERTILIZE_ORGANIC: "орг. удобрение",
        REPOT: "пересадка",
        PRUNE: "обрезка",
        FERTILIZE: "подкормка",
      };
      const logLines = plant.careLogs.map((log) => {
        const label = typeLabels[log.type] || log.type;
        const date = new Date(log.doneAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
        return `${label}: ${date}`;
      });
      systemPrompt += `\n\nНедавние действия по уходу:\n${logLines.join("\n")}`;
    }

    // Optional egress proxy
    const dispatcher = process.env.NODE_ENV === "production" && PROXY_URL
      ? new ProxyAgent(PROXY_URL)
      : undefined;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: true,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: "Проанализируй это фото моего растения. Определи его состояние здоровья, найди возможные проблемы и дай рекомендации по уходу.",
              },
            ],
          },
        ],
        max_tokens: 2048,
      }),
      // @ts-expect-error undici dispatcher option for Node.js fetch
      dispatcher,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[Diagnose]", res.status, text);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Unlock diagnosis achievement (non-blocking)
    unlockDiagnosisAchievement(session.user.id, db).catch(() => {});

    // Stream the Anthropic SSE response
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...rateLimitHeaders(rl),
      },
    });
  } catch (err) {
    console.error("[Diagnose]", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

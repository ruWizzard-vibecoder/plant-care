import { NextRequest } from "next/server";
import { ProxyAgent } from "undici";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { checkRateLimit, rateLimitHeaders, rateLimitResponse } from "@/server/lib/rate-limit";

function getSeasonRu(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "весна";
  if (month >= 5 && month <= 7) return "лето";
  if (month >= 8 && month <= 10) return "осень";
  return "зима";
}

const PROXY_URL = process.env.HTTPS_PROXY || "";
const MAX_QUESTION_LENGTH = 500;

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

    // Rate limit: 10 per minute
    const rl = checkRateLimit(session.user.id, "ai-tips", {
      windowMs: 60_000,
      maxRequests: 10,
    });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Parse and validate input
    const body = await req.json();
    const { plantId, question } = body as { plantId?: string; question?: string };

    if (!plantId || typeof plantId !== "string") {
      return new Response(JSON.stringify({ error: "plantId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Вопрос слишком длинный (максимум ${MAX_QUESTION_LENGTH} символов)` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.AI_MODEL || "claude-haiku-4-5-20251001";

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch plant data from DB (server-side — prevents prompt injection)
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

    // Build system prompt from trusted DB data
    const plantName = plant.nickname ?? plant.customName ?? plant.species?.commonNameRu ?? "Растение";
    const speciesName = plant.species?.scientificName;
    const season = getSeasonRu();

    let systemPrompt = `Ты — эксперт-ботаник и помощник по уходу за комнатными растениями. Отвечай кратко (2-4 абзаца), дружелюбно и по делу на русском языке. Используй эмодзи уместно. Если не уверен — честно скажи об этом.

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
      if (species.fertilizingFreqDays) needs.push(`подкормка каждые ${species.fertilizingFreqDays} дн.`);
      if (species.repottingFreqDays) needs.push(`пересадка каждые ${species.repottingFreqDays} дн.`);
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

    // Season-specific guidance
    systemPrompt += `\n\nУчитывай сезон (${season}) в рекомендациях: зимой реже полив и без подкормок, летом чаще полив и больше света, весной — время пересадки и начала подкормок.`;

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
        messages: [{ role: "user", content: question.trim() }],
        max_tokens: 1024,
      }),
      // @ts-expect-error undici dispatcher option for Node.js fetch
      dispatcher,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[AI Tips]", res.status, text);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream the Anthropic SSE response through
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...rateLimitHeaders(rl),
      },
    });
  } catch (err) {
    console.error("[AI Tips]", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

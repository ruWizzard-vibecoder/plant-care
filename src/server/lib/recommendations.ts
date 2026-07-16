import type { TaskType } from "@prisma/client";

export interface Recommendation {
  plantId: string;
  plantName: string;
  thumbnailUrl: string | null;
  type: TaskType;
  urgency: "overdue" | "soon" | "upcoming" | "ok";
  daysSinceLast: number | null;
  recommendedFreqDays: number;
  message: string;
}

interface PlantData {
  id: string;
  nickname: string | null;
  customName: string | null;
  species: {
    commonNameRu: string;
    thumbnailUrl: string | null;
    waterNeed: number;
    lightNeed: number;
    humidityNeed: number;
    wateringFreqDays: number;
    fertilizingFreqDays: number;
    fertilizingOrganicFreqDays: number;
    repottingFreqDays: number;
  } | null;
  room: { tempC: number | null; humidityPct: number | null } | null;
  photos: { url: string; isCover: boolean }[];
}

interface LogEntry {
  type: TaskType;
  doneAt: Date;
}

const FREQ_MAP: Record<string, (s: PlantData["species"]) => number | null> = {
  WATER: (s) => s?.wateringFreqDays ?? 7,
  SPRAY: (s) => (s && s.humidityNeed >= 3 ? 7 : null),
  FERTILIZE_MINERAL: (s) => s?.fertilizingFreqDays ?? 30,
  FERTILIZE_ORGANIC: (s) => s?.fertilizingOrganicFreqDays ?? 90,
  REPOT: (s) => s?.repottingFreqDays ?? 365,
};

const TYPE_LABELS: Record<string, string> = {
  WATER: "полив",
  SPRAY: "опрыскивание",
  FERTILIZE_MINERAL: "мин. удобрение",
  FERTILIZE_ORGANIC: "орг. удобрение",
  REPOT: "пересадка",
};

export function calculateRecommendations(
  plant: PlantData,
  recentLogs: LogEntry[],
  now: Date
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const species = plant.species;
  const month = now.getMonth();
  const isWinter = month === 11 || month === 0 || month === 1;

  const plantName =
    plant.nickname ?? plant.customName ?? species?.commonNameRu ?? "Растение";
  const thumbnailUrl =
    plant.photos.find((p) => p.isCover)?.url ??
    plant.photos[0]?.url ??
    species?.thumbnailUrl ??
    null;

  const logsByType = new Map<string, Date>();
  for (const log of recentLogs) {
    const existing = logsByType.get(log.type);
    if (!existing || log.doneAt > existing) {
      logsByType.set(log.type, log.doneAt);
    }
  }

  for (const [type, getFreq] of Object.entries(FREQ_MAP)) {
    const freqDays = getFreq(species);
    if (freqDays === null) continue;

    // Skip organic fertilizer and mineral fertilizer in winter
    if (isWinter && (type === "FERTILIZE_MINERAL" || type === "FERTILIZE_ORGANIC")) {
      continue;
    }

    // Adjust watering frequency: winter +50%, summer -20%
    let adjustedFreq = freqDays;
    if (type === "WATER") {
      if (isWinter) adjustedFreq = Math.round(freqDays * 1.5);
      else if (month >= 5 && month <= 7) adjustedFreq = Math.round(freqDays * 0.8);
    }

    // Low humidity room → recommend spraying more often
    if (type === "SPRAY" && plant.room?.humidityPct != null && plant.room.humidityPct < 40) {
      adjustedFreq = Math.max(3, adjustedFreq - 2);
    }

    const lastDone = logsByType.get(type);
    const daysSinceLast = lastDone
      ? Math.floor((now.getTime() - lastDone.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let urgency: Recommendation["urgency"];
    let message: string;
    const label = TYPE_LABELS[type] ?? type;

    if (daysSinceLast === null) {
      urgency = "soon";
      message = `${label} ещё не выполнялся`;
    } else if (daysSinceLast >= adjustedFreq * 1.5) {
      urgency = "overdue";
      message = `${daysSinceLast} дн. назад (рек. каждые ${adjustedFreq} дн.)`;
    } else if (daysSinceLast >= adjustedFreq) {
      urgency = "soon";
      message = `${daysSinceLast} дн. назад (рек. каждые ${adjustedFreq} дн.)`;
    } else if (daysSinceLast >= adjustedFreq - 2) {
      urgency = "upcoming";
      message = `${daysSinceLast} дн. назад, скоро нужен ${label}`;
    } else {
      urgency = "ok";
      message = `${daysSinceLast} дн. назад`;
    }

    recommendations.push({
      plantId: plant.id,
      plantName,
      thumbnailUrl,
      type: type as TaskType,
      urgency,
      daysSinceLast,
      recommendedFreqDays: adjustedFreq,
      message,
    });
  }

  return recommendations;
}

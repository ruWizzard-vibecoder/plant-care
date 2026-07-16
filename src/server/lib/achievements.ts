import type { PrismaClient } from "@prisma/client";

// ============================================================
// Achievement Definitions
// ============================================================

export interface AchievementDef {
  type: string;
  label: string;
  description: string;
  icon: string;
  group: "collection" | "care" | "growth" | "propagation" | "photo" | "diagnosis" | "wishlist";
  threshold?: number; // for progress tracking
}

export const ALL_ACHIEVEMENTS: AchievementDef[] = [
  // Collection
  { type: "FIRST_PLANT", label: "Первый росток", description: "Добавить первое растение", icon: "🌱", group: "collection", threshold: 1 },
  { type: "COLLECTOR_5", label: "Начинающий коллекционер", description: "Собрать 5 растений", icon: "🪴", group: "collection", threshold: 5 },
  { type: "COLLECTOR_10", label: "Опытный коллекционер", description: "Собрать 10 растений", icon: "🌿", group: "collection", threshold: 10 },
  { type: "COLLECTOR_25", label: "Мастер коллекции", description: "Собрать 25 растений", icon: "🌳", group: "collection", threshold: 25 },
  { type: "CATEGORY_EXPLORER", label: "Исследователь", description: "Растения из 3+ категорий", icon: "🧭", group: "collection", threshold: 3 },
  { type: "CATEGORY_MASTER", label: "Знаток флоры", description: "Растения из 6+ категорий", icon: "🏛️", group: "collection", threshold: 6 },
  // Care
  { type: "FIRST_CARE", label: "Первый уход", description: "Записать первое действие по уходу", icon: "💧", group: "care", threshold: 1 },
  { type: "CARE_STREAK_7", label: "Неделя заботы", description: "7 дней подряд с уходом", icon: "🔥", group: "care", threshold: 7 },
  { type: "CARE_STREAK_30", label: "Месяц заботы", description: "30 дней подряд с уходом", icon: "⚡", group: "care", threshold: 30 },
  { type: "CARE_STREAK_100", label: "Легенда заботы", description: "100 дней подряд с уходом", icon: "👑", group: "care", threshold: 100 },
  { type: "CARE_100", label: "Сотня действий", description: "100 действий по уходу всего", icon: "💪", group: "care", threshold: 100 },
  { type: "CARE_500", label: "Неутомимый садовод", description: "500 действий по уходу", icon: "🏆", group: "care", threshold: 500 },
  // Growth
  { type: "FIRST_MEASUREMENT", label: "Первое измерение", description: "Записать первое измерение роста", icon: "📏", group: "growth", threshold: 1 },
  { type: "GROWTH_TRACKER_10", label: "Наблюдатель роста", description: "10 измерений роста", icon: "📊", group: "growth", threshold: 10 },
  { type: "GROWTH_CHAMPION", label: "Чемпион роста", description: "Растение выросло на 50%+", icon: "🚀", group: "growth" },
  // Propagation
  { type: "FIRST_PROPAGATION", label: "Первый черенок", description: "Начать первое размножение", icon: "✂️", group: "propagation", threshold: 1 },
  { type: "PROPAGATION_SUCCESS", label: "Успешный черенок", description: "Первое успешное размножение", icon: "🎉", group: "propagation", threshold: 1 },
  { type: "PROPAGATION_MASTER", label: "Мастер размножения", description: "5 успешных размножений", icon: "🧬", group: "propagation", threshold: 5 },
  // Photo
  { type: "FIRST_PHOTO", label: "Первое фото", description: "Добавить первое фото растения", icon: "📸", group: "photo", threshold: 1 },
  { type: "PHOTOGRAPHER_20", label: "Фотограф растений", description: "20 фотографий растений", icon: "🖼️", group: "photo", threshold: 20 },
  // Diagnosis
  { type: "FIRST_DIAGNOSIS", label: "Первая диагностика", description: "Провести первую AI-диагностику", icon: "🔬", group: "diagnosis", threshold: 1 },
  // Wishlist
  { type: "FIRST_WISHLIST", label: "Первое желание", description: "Добавить первое растение в список желаний", icon: "💝", group: "wishlist", threshold: 1 },
  { type: "WISHLIST_COLLECTOR_10", label: "Мечтатель", description: "10 растений в списке желаний", icon: "🌟", group: "wishlist", threshold: 10 },
];

const GROUP_LABELS: Record<string, string> = {
  collection: "Коллекция",
  care: "Уход",
  growth: "Рост",
  propagation: "Размножение",
  photo: "Фотографии",
  diagnosis: "Диагностика",
  wishlist: "Список желаний",
};

export { GROUP_LABELS };

// ============================================================
// Aggregation Context
// ============================================================

interface AggregateData {
  plantCount: number;
  categoryCount: number;
  totalCareLogs: number;
  careStreak: number;
  growthRecordCount: number;
  maxGrowthPct: number;
  propagationTotal: number;
  propagationSuccessCount: number;
  photoCount: number;
  wishlistCount: number;
}

async function fetchAggregates(userId: string, db: PrismaClient): Promise<AggregateData> {
  const userPlantIds = await db.userPlant.findMany({
    where: { userId, isArchived: false },
    select: { id: true, speciesId: true },
  });
  const plantIds = userPlantIds.map((p: { id: string }) => p.id);
  const plantCount = plantIds.length;

  // Unique categories
  const categories = new Set(
    userPlantIds
      .map((p: { speciesId: string | null }) => p.speciesId)
      .filter(Boolean)
  );
  // We need to count distinct categories from species
  const speciesWithCategories = plantCount > 0
    ? await db.plantSpecies.findMany({
        where: { id: { in: userPlantIds.map((p: { speciesId: string | null }) => p.speciesId).filter(Boolean) as string[] } },
        select: { category: true },
      })
    : [];
  const categoryCount = new Set(
    speciesWithCategories.map((s: { category: string | null }) => s.category).filter(Boolean)
  ).size;

  // Care logs count
  const totalCareLogs = plantIds.length > 0
    ? await db.careLog.count({ where: { plantId: { in: plantIds } } })
    : 0;

  // Care streak — distinct dates with care, count consecutive from today
  const careStreak = plantIds.length > 0
    ? await calculateCareStreak(plantIds, db)
    : 0;

  // Growth records count
  const growthRecordCount = plantIds.length > 0
    ? await db.growthRecord.count({ where: { plantId: { in: plantIds } } })
    : 0;

  // Max growth percentage
  const maxGrowthPct = plantIds.length > 0
    ? await calculateMaxGrowthPct(plantIds, db)
    : 0;

  // Propagation counts
  const propagationTotal = plantIds.length > 0
    ? await db.propagation.count({ where: { parentPlantId: { in: plantIds } } })
    : 0;
  const propagationSuccessCount = plantIds.length > 0
    ? await db.propagation.count({ where: { parentPlantId: { in: plantIds }, status: "PLANTED" } })
    : 0;

  // Photo count
  const photoCount = plantIds.length > 0
    ? await db.plantPhoto.count({ where: { plantId: { in: plantIds } } })
    : 0;

  const wishlistCount = await db.wishlistItem.count({ where: { userId } });

  return {
    plantCount,
    categoryCount,
    totalCareLogs,
    careStreak,
    growthRecordCount,
    maxGrowthPct,
    propagationTotal,
    propagationSuccessCount,
    photoCount,
    wishlistCount,
  };
}

async function calculateCareStreak(plantIds: string[], db: PrismaClient): Promise<number> {
  // Get distinct care dates, most recent first
  const logs = await db.careLog.findMany({
    where: { plantId: { in: plantIds } },
    select: { doneAt: true },
    orderBy: { doneAt: "desc" },
  });

  if (logs.length === 0) return 0;

  // Extract unique dates (YYYY-MM-DD)
  const uniqueDates = [...new Set(
    logs.map((l: { doneAt: Date }) => l.doneAt.toISOString().slice(0, 10))
  )].sort().reverse();

  if (uniqueDates.length === 0) return 0;

  // Count consecutive days from today or yesterday
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Streak must start from today or yesterday
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    const curr = new Date(uniqueDates[i]);
    const diffDays = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.abs(diffDays - 1) < 0.1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

async function calculateMaxGrowthPct(plantIds: string[], db: PrismaClient): Promise<number> {
  let maxPct = 0;

  for (const plantId of plantIds) {
    const records = await db.growthRecord.findMany({
      where: { plantId, heightCm: { not: null } },
      orderBy: { recordedAt: "asc" },
      select: { heightCm: true },
      take: 100,
    });

    if (records.length >= 2) {
      const first = records[0].heightCm!;
      const last = records[records.length - 1].heightCm!;
      if (first > 0) {
        const pct = ((last - first) / first) * 100;
        if (pct > maxPct) maxPct = pct;
      }
    }
  }

  return maxPct;
}

// ============================================================
// Evaluator — Check & Unlock Achievements
// ============================================================

interface NewAchievement {
  type: string;
  label: string;
  icon: string;
}

// Map achievement type to check function
function checkAchievement(type: string, data: AggregateData): boolean {
  switch (type) {
    case "FIRST_PLANT": return data.plantCount >= 1;
    case "COLLECTOR_5": return data.plantCount >= 5;
    case "COLLECTOR_10": return data.plantCount >= 10;
    case "COLLECTOR_25": return data.plantCount >= 25;
    case "CATEGORY_EXPLORER": return data.categoryCount >= 3;
    case "CATEGORY_MASTER": return data.categoryCount >= 6;
    case "FIRST_CARE": return data.totalCareLogs >= 1;
    case "CARE_STREAK_7": return data.careStreak >= 7;
    case "CARE_STREAK_30": return data.careStreak >= 30;
    case "CARE_STREAK_100": return data.careStreak >= 100;
    case "CARE_100": return data.totalCareLogs >= 100;
    case "CARE_500": return data.totalCareLogs >= 500;
    case "FIRST_MEASUREMENT": return data.growthRecordCount >= 1;
    case "GROWTH_TRACKER_10": return data.growthRecordCount >= 10;
    case "GROWTH_CHAMPION": return data.maxGrowthPct >= 50;
    case "FIRST_PROPAGATION": return data.propagationTotal >= 1;
    case "PROPAGATION_SUCCESS": return data.propagationSuccessCount >= 1;
    case "PROPAGATION_MASTER": return data.propagationSuccessCount >= 5;
    case "FIRST_PHOTO": return data.photoCount >= 1;
    case "PHOTOGRAPHER_20": return data.photoCount >= 20;
    case "FIRST_WISHLIST": return data.wishlistCount >= 1;
    case "WISHLIST_COLLECTOR_10": return data.wishlistCount >= 10;
    default: return false;
  }
}

export async function evaluateAchievements(
  userId: string,
  db: PrismaClient
): Promise<NewAchievement[]> {
  // Get already unlocked
  const existing = await db.userAchievement.findMany({
    where: { userId },
    select: { type: true },
  });
  const unlockedTypes = new Set(existing.map((a: { type: string }) => a.type));

  // Filter to only unchecked achievements (skip FIRST_DIAGNOSIS — handled separately)
  const toCheck = ALL_ACHIEVEMENTS.filter(
    (a) => !unlockedTypes.has(a.type) && a.type !== "FIRST_DIAGNOSIS"
  );

  if (toCheck.length === 0) return [];

  // Fetch aggregate data
  const data = await fetchAggregates(userId, db);

  // Check each
  const newUnlocks: NewAchievement[] = [];
  const createData: { userId: string; type: unknown; }[] = [];

  for (const achievement of toCheck) {
    if (checkAchievement(achievement.type, data)) {
      newUnlocks.push({
        type: achievement.type,
        label: achievement.label,
        icon: achievement.icon,
      });
      createData.push({
        userId,
        type: achievement.type as unknown,
      });
    }
  }

  // Batch create
  if (createData.length > 0) {
    for (const item of createData) {
      await db.userAchievement.create({
        data: {
          userId: item.userId,
          type: item.type as never,
        },
      });
    }
  }

  return newUnlocks;
}

// Special: unlock FIRST_DIAGNOSIS (called from /api/diagnose)
export async function unlockDiagnosisAchievement(
  userId: string,
  db: PrismaClient
): Promise<NewAchievement | null> {
  const existing = await db.userAchievement.findUnique({
    where: { userId_type: { userId, type: "FIRST_DIAGNOSIS" as never } },
  });
  if (existing) return null;

  await db.userAchievement.create({
    data: { userId, type: "FIRST_DIAGNOSIS" as never },
  });

  return { type: "FIRST_DIAGNOSIS", label: "Первая диагностика", icon: "🔬" };
}

// Get progress data for a user (for display)
export async function getAchievementProgress(
  userId: string,
  db: PrismaClient
): Promise<Record<string, number>> {
  const userPlantIds = await db.userPlant.findMany({
    where: { userId, isArchived: false },
    select: { id: true, speciesId: true },
  });
  const plantIds = userPlantIds.map((p: { id: string }) => p.id);

  const speciesWithCategories = plantIds.length > 0
    ? await db.plantSpecies.findMany({
        where: { id: { in: userPlantIds.map((p: { speciesId: string | null }) => p.speciesId).filter(Boolean) as string[] } },
        select: { category: true },
      })
    : [];

  const totalCareLogs = plantIds.length > 0
    ? await db.careLog.count({ where: { plantId: { in: plantIds } } })
    : 0;

  const careStreak = plantIds.length > 0
    ? await calculateCareStreak(plantIds, db)
    : 0;

  const growthRecordCount = plantIds.length > 0
    ? await db.growthRecord.count({ where: { plantId: { in: plantIds } } })
    : 0;

  const propagationTotal = plantIds.length > 0
    ? await db.propagation.count({ where: { parentPlantId: { in: plantIds } } })
    : 0;

  const propagationSuccessCount = plantIds.length > 0
    ? await db.propagation.count({ where: { parentPlantId: { in: plantIds }, status: "PLANTED" } })
    : 0;

  const photoCount = plantIds.length > 0
    ? await db.plantPhoto.count({ where: { plantId: { in: plantIds } } })
    : 0;

  const wishlistCount = await db.wishlistItem.count({ where: { userId } });

  return {
    plantCount: plantIds.length,
    categoryCount: new Set(speciesWithCategories.map((s: { category: string | null }) => s.category).filter(Boolean)).size,
    totalCareLogs,
    careStreak,
    growthRecordCount,
    propagationTotal,
    propagationSuccessCount,
    photoCount,
    wishlistCount,
  };
}

import type { PrismaClient } from "@prisma/client";

export interface CommunityStats {
  totalUsers: number;
  avgPlantsPerUser: number;
  avgCareLogsPerWeek: number;
  topSpecies: { speciesId: string; commonNameRu: string; count: number }[];
  topCategories: { category: string; label: string; count: number }[];
  avgCareStreak: number;
  totalPropagations: number;
  updatedAt: Date;
}

const CATEGORY_LABELS: Record<string, string> = {
  SUCCULENTS: "Суккуленты",
  FOLIAGE: "Декоративно-лиственные",
  TROPICAL: "Тропические",
  FLOWERING: "Цветущие",
  FERNS: "Папоротники",
  PALMS: "Пальмы",
  CLIMBING: "Вьющиеся",
  LARGE: "Крупномеры",
};

let cachedStats: CommunityStats | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getCommunityStats(db: PrismaClient): Promise<CommunityStats> {
  if (cachedStats && Date.now() < cacheExpiry) {
    return cachedStats;
  }
  await refreshCommunityStats(db);
  return cachedStats!;
}

export async function refreshCommunityStats(db: PrismaClient): Promise<void> {
  try {
    // Total users with at least 1 plant
    const usersWithPlants = await db.userPlant.groupBy({
      by: ["userId"],
      where: { isArchived: false },
      _count: true,
    });
    const totalUsers = usersWithPlants.length;

    // Average plants per user
    const totalPlants = usersWithPlants.reduce(
      (sum: number, u: { _count: number }) => sum + u._count, 0
    );
    const avgPlantsPerUser = totalUsers > 0 ? Math.round((totalPlants / totalUsers) * 10) / 10 : 0;

    // Average care logs per week (last 4 weeks)
    const fourWeeksAgo = new Date(Date.now() - 28 * 86400000);
    const recentLogs = await db.careLog.count({
      where: { doneAt: { gte: fourWeeksAgo } },
    });
    const avgCareLogsPerWeek = totalUsers > 0
      ? Math.round((recentLogs / 4 / totalUsers) * 10) / 10
      : 0;

    // Top 5 species by number of user plants
    const speciesCounts = await db.userPlant.groupBy({
      by: ["speciesId"],
      where: { isArchived: false, speciesId: { not: null } },
      _count: true,
      orderBy: { _count: { speciesId: "desc" } },
      take: 5,
    });
    const speciesIds = speciesCounts
      .map((s: { speciesId: string | null }) => s.speciesId)
      .filter(Boolean) as string[];
    const speciesNames = speciesIds.length > 0
      ? await db.plantSpecies.findMany({
          where: { id: { in: speciesIds } },
          select: { id: true, commonNameRu: true },
        })
      : [];
    const nameMap = new Map(speciesNames.map((s: { id: string; commonNameRu: string }) => [s.id, s.commonNameRu]));
    const topSpecies = speciesCounts
      .filter((s: { speciesId: string | null }) => s.speciesId)
      .map((s: { speciesId: string | null; _count: number }) => ({
        speciesId: s.speciesId!,
        commonNameRu: nameMap.get(s.speciesId!) ?? "Неизвестный вид",
        count: s._count,
      }));

    // Top categories
    const allPlantSpeciesIds = await db.userPlant.findMany({
      where: { isArchived: false, speciesId: { not: null } },
      select: { speciesId: true },
    });
    const allSpeciesData = allPlantSpeciesIds.length > 0
      ? await db.plantSpecies.findMany({
          where: {
            id: { in: [...new Set(allPlantSpeciesIds.map((p: { speciesId: string | null }) => p.speciesId).filter(Boolean) as string[])] },
            category: { not: null },
          },
          select: { id: true, category: true },
        })
      : [];
    const catMap = new Map(allSpeciesData.map((s: { id: string; category: string | null }) => [s.id, s.category]));
    const catCounts = new Map<string, number>();
    for (const p of allPlantSpeciesIds) {
      const cat = catMap.get(p.speciesId!);
      if (cat) catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    }
    const topCategories = [...catCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, count]) => ({
        category: cat,
        label: CATEGORY_LABELS[cat] ?? cat,
        count,
      }));

    // Total propagations
    const totalPropagations = await db.propagation.count();

    // Average care streak is expensive to calculate for all users — approximate with 0 for now
    // (can be computed in a future optimization)
    const avgCareStreak = 0;

    cachedStats = {
      totalUsers,
      avgPlantsPerUser,
      avgCareLogsPerWeek,
      topSpecies,
      topCategories,
      avgCareStreak,
      totalPropagations,
      updatedAt: new Date(),
    };
    cacheExpiry = Date.now() + CACHE_TTL;
  } catch (error) {
    console.error("[community-stats] Failed to refresh:", error);
    // Keep stale cache if available
    if (!cachedStats) {
      cachedStats = {
        totalUsers: 0,
        avgPlantsPerUser: 0,
        avgCareLogsPerWeek: 0,
        topSpecies: [],
        topCategories: [],
        avgCareStreak: 0,
        totalPropagations: 0,
        updatedAt: new Date(),
      };
    }
  }
}

"use client";

import Link from "next/link";
import { ArrowLeft, Trophy, TrendingUp, Lock } from "lucide-react";
import { trpc } from "@/trpc/client";

const GROUP_ORDER = ["collection", "care", "growth", "propagation", "photo", "diagnosis"] as const;

function progressValue(type: string, progress: Record<string, number>): { current: number; target: number } | null {
  switch (type) {
    case "FIRST_PLANT": return { current: progress.plantCount ?? 0, target: 1 };
    case "COLLECTOR_5": return { current: progress.plantCount ?? 0, target: 5 };
    case "COLLECTOR_10": return { current: progress.plantCount ?? 0, target: 10 };
    case "COLLECTOR_25": return { current: progress.plantCount ?? 0, target: 25 };
    case "CATEGORY_EXPLORER": return { current: progress.categoryCount ?? 0, target: 3 };
    case "CATEGORY_MASTER": return { current: progress.categoryCount ?? 0, target: 6 };
    case "FIRST_CARE": return { current: progress.totalCareLogs ?? 0, target: 1 };
    case "CARE_STREAK_7": return { current: progress.careStreak ?? 0, target: 7 };
    case "CARE_STREAK_30": return { current: progress.careStreak ?? 0, target: 30 };
    case "CARE_STREAK_100": return { current: progress.careStreak ?? 0, target: 100 };
    case "CARE_100": return { current: progress.totalCareLogs ?? 0, target: 100 };
    case "CARE_500": return { current: progress.totalCareLogs ?? 0, target: 500 };
    case "FIRST_MEASUREMENT": return { current: progress.growthRecordCount ?? 0, target: 1 };
    case "GROWTH_TRACKER_10": return { current: progress.growthRecordCount ?? 0, target: 10 };
    case "FIRST_PROPAGATION": return { current: progress.propagationTotal ?? 0, target: 1 };
    case "PROPAGATION_SUCCESS": return { current: progress.propagationSuccessCount ?? 0, target: 1 };
    case "PROPAGATION_MASTER": return { current: progress.propagationSuccessCount ?? 0, target: 5 };
    case "FIRST_PHOTO": return { current: progress.photoCount ?? 0, target: 1 };
    case "PHOTOGRAPHER_20": return { current: progress.photoCount ?? 0, target: 20 };
    default: return null;
  }
}

export default function AchievementsPage() {
  const { data, isLoading } = trpc.achievements.list.useQuery();
  const { data: comparison } = trpc.community.comparison.useQuery();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12 lg:max-w-3xl">
        <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
        <div className="mt-6 grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { achievements, progress, groupLabels } = data;
  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;

  // Group achievements
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    label: groupLabels[group] ?? group,
    items: achievements.filter((a) => a.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-md lg:max-w-3xl xl:max-w-4xl">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between px-4 pt-12">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-base font-semibold">Достижения</h2>
        <div className="w-9" />
      </div>

      {/* Summary card */}
      <div className="animate-fade-up mx-4 mt-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Trophy size={24} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">
              {unlockedCount}
              <span className="text-sm font-medium text-amber-500"> / {achievements.length}</span>
            </p>
            <p className="text-xs text-amber-600/70">достижений разблокировано</p>
          </div>
        </div>
      </div>

      {/* Achievement groups */}
      <div className="px-4 mt-5 space-y-5 pb-6">
        {grouped.map((group, gi) => (
          <div
            key={group.group}
            className="animate-fade-up"
            style={{ animationDelay: `${100 + gi * 60}ms` }}
          >
            <h3 className="text-sm font-bold text-foreground">{group.label}</h3>
            <div className="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-4 lg:gap-3">
              {group.items.map((ach) => {
                const unlocked = !!ach.unlockedAt;
                const prog = progressValue(ach.type, progress);
                const pct = prog
                  ? Math.min(100, Math.round((prog.current / prog.target) * 100))
                  : 0;

                return (
                  <div
                    key={ach.type}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all lg:gap-2 lg:p-5 ${
                      unlocked
                        ? "bg-surface border-amber-200/60"
                        : "bg-muted/30 border-border/20 opacity-60"
                    }`}
                    style={unlocked ? { boxShadow: "0 2px 8px rgba(245,158,11,0.12)" } : undefined}
                  >
                    <span className="text-2xl lg:text-4xl">{unlocked ? ach.icon : "🔒"}</span>
                    <span className="text-[10px] font-bold text-center leading-tight lg:text-xs">
                      {ach.label}
                    </span>
                    {unlocked ? (
                      <span className="text-[9px] text-amber-600/80 lg:text-[11px]">
                        {new Date(ach.unlockedAt!).toLocaleDateString("ru")}
                      </span>
                    ) : prog ? (
                      <div className="w-full">
                        <div className="h-1 w-full rounded-full bg-border/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[8px] text-muted-foreground mt-0.5 block text-center">
                          {prog.current}/{prog.target}
                        </span>
                      </div>
                    ) : (
                      <Lock size={10} className="text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Community comparison */}
        {comparison && (
          <div
            className="animate-fade-up rounded-2xl bg-surface border border-border/30 p-4"
            style={{ animationDelay: "400ms", boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-leaf" />
              <h3 className="text-sm font-bold">Вы и сообщество</h3>
            </div>
            <div className="mt-3 space-y-3">
              <ComparisonRow
                label="Растений"
                userValue={comparison.user.plantCount}
                avgValue={comparison.community.avgPlantsPerUser}
              />
              <ComparisonRow
                label="Действий по уходу"
                userValue={comparison.user.totalCareLogs}
                avgValue={Math.round(comparison.community.avgCareLogsPerWeek * 4)}
                avgLabel="ср. в месяц"
              />
              {comparison.community.topSpecies.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-medium text-muted-foreground">Популярные виды</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {comparison.community.topSpecies.slice(0, 3).map((s) => (
                      <span
                        key={s.speciesId}
                        className="rounded-lg bg-leaf/10 px-2 py-0.5 text-[10px] font-medium text-leaf"
                      >
                        {s.commonNameRu}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  userValue,
  avgValue,
  avgLabel,
}: {
  label: string;
  userValue: number;
  avgValue: number;
  avgLabel?: string;
}) {
  const better = userValue >= avgValue;
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold ${better ? "text-leaf" : "text-foreground"}`}>
          {userValue}
        </span>
        <span className="text-[10px] text-muted-foreground">
          vs {avgValue.toFixed(1)} {avgLabel ?? "средн."}
        </span>
      </div>
    </div>
  );
}

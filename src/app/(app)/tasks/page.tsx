"use client";

import { useState, useCallback } from "react";
import {
  Droplets,
  SprayCan,
  FlaskConical,
  RefreshCw,
  Scissors,
  Wrench,
  Check,
  Leaf,
  ListChecks,
  Clock,
  CircleCheckBig,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { format, isToday, isPast, isFuture } from "date-fns";
import { ru } from "date-fns/locale";

const TASK_TYPE_MAP: Record<
  string,
  { icon: typeof Droplets; label: string; color: string; bgLight: string }
> = {
  WATER: { icon: Droplets, label: "Полив", color: "#1B5E20", bgLight: "rgba(27,94,32,0.08)" },
  SPRAY: { icon: SprayCan, label: "Опрыскивание", color: "#1565C0", bgLight: "rgba(21,101,192,0.08)" },
  FERTILIZE: { icon: FlaskConical, label: "Подкормка", color: "#E65100", bgLight: "rgba(230,81,0,0.08)" },
  REPOT: { icon: RefreshCw, label: "Пересадка", color: "#BF360C", bgLight: "rgba(191,54,12,0.08)" },
  PRUNE: { icon: Scissors, label: "Обрезка", color: "#AD1457", bgLight: "rgba(173,20,87,0.08)" },
  CUSTOM: { icon: Wrench, label: "Другое", color: "#5a7a5a", bgLight: "rgba(90,122,90,0.08)" },
};

type TabId = "today" | "upcoming" | "completed";

const TABS: { id: TabId; label: string; icon: typeof ListChecks }[] = [
  { id: "today", label: "Сегодня", icon: ListChecks },
  { id: "upcoming", label: "Предстоящие", icon: Clock },
  { id: "completed", label: "Выполненные", icon: CircleCheckBig },
];

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<TabId>("today");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const { data: todayTasks, isLoading, refetch } = trpc.tasks.todayTasks.useQuery();
  const completeMutation = trpc.tasks.complete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleComplete = useCallback(
    (taskId: string) => {
      setCompletedIds((prev) => new Set(prev).add(taskId));
      completeMutation.mutate({ taskId });
    },
    [completeMutation]
  );

  const allTasks = todayTasks ?? [];
  const pending = allTasks.filter((t) => !completedIds.has(t.id));
  const done = allTasks.filter((t) => completedIds.has(t.id));
  const overdue = pending.filter((t) => isPast(new Date(t.nextDueAt)) && !isToday(new Date(t.nextDueAt)));
  const todayOnly = pending.filter((t) => isToday(new Date(t.nextDueAt)));
  const upcoming = pending.filter((t) => isFuture(new Date(t.nextDueAt)) && !isToday(new Date(t.nextDueAt)));

  const currentTasks =
    activeTab === "today" ? [...overdue, ...todayOnly] : activeTab === "upcoming" ? upcoming : done;

  // Group by type
  const grouped = currentTasks.reduce<Record<string, typeof currentTasks>>((acc, task) => {
    if (!acc[task.type]) acc[task.type] = [];
    acc[task.type].push(task);
    return acc;
  }, {});

  const totalPending = pending.length;

  return (
    <div className="mx-auto max-w-md px-4 pt-12 pb-8 lg:max-w-2xl">
      {/* Header */}
      <div className="animate-fade-up flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Задачи</h1>
        {totalPending > 0 && (
          <div className="flex h-7 min-w-7 items-center justify-center rounded-full bg-leaf px-2 text-xs font-bold text-white tabular-nums">
            {totalPending}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        className="animate-fade-up mt-5 flex gap-1 rounded-2xl bg-greenhouse/60 p-1"
        style={{ animationDelay: "60ms" }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-250",
                active
                  ? "bg-surface text-leaf"
                  : "text-muted-foreground hover:text-foreground-secondary"
              )}
              style={active ? { boxShadow: "0 1px 4px rgba(27,94,32,0.1)" } : undefined}
            >
              <tab.icon size={13} strokeWidth={active ? 2.4 : 1.8} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="mt-6 space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[76px] animate-pulse rounded-2xl bg-muted"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* Empty states */}
      {!isLoading && currentTasks.length === 0 && (
        <div className="animate-scale-in mt-16 flex flex-col items-center text-center">
          {activeTab === "today" && (
            <>
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-greenhouse to-dew">
                  <Check size={32} className="text-leaf" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-leaf text-white">
                  <Leaf size={14} />
                </div>
              </div>
              <p className="mt-5 text-base font-bold tracking-tight">Всё сделано!</p>
              <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                Ваши растения ухожены и довольны. Отдыхайте — вы это заслужили.
              </p>
            </>
          )}
          {activeTab === "upcoming" && (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-greenhouse to-dew">
                <Clock size={32} className="text-stem" />
              </div>
              <p className="mt-5 text-base font-bold tracking-tight">Нет предстоящих задач</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Все задачи запланированы на сегодня
              </p>
            </>
          )}
          {activeTab === "completed" && (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-greenhouse to-dew">
                <CircleCheckBig size={32} className="text-stem" />
              </div>
              <p className="mt-5 text-base font-bold tracking-tight">Пока пусто</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Отмечайте задачи — они появятся здесь
              </p>
            </>
          )}
        </div>
      )}

      {/* Task groups */}
      {!isLoading && (
        <div className="stagger mt-5 space-y-5">
          {Object.entries(grouped).map(([type, typeTasks]) => {
            const cfg = TASK_TYPE_MAP[type] ?? TASK_TYPE_MAP.CUSTOM;
            const TypeIcon = cfg.icon;

            return (
              <div key={type} className="animate-fade-up">
                {/* Type header */}
                <div className="mb-2.5 flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-lg"
                    style={{ backgroundColor: cfg.bgLight }}
                  >
                    <TypeIcon size={12} style={{ color: cfg.color }} strokeWidth={2.4} />
                  </div>
                  <span
                    className="text-[11px] font-bold tracking-widest uppercase"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {typeTasks.length}
                  </span>
                </div>

                {/* Task cards */}
                <div className="space-y-2">
                  {typeTasks.map((task) => {
                    const isDone = completedIds.has(task.id);
                    const plantName =
                      task.plant.nickname ?? task.plant.species?.commonNameRu ?? "Растение";
                    const thumbnailUrl = task.plant.photos?.[0]?.url ?? task.plant.species?.thumbnailUrl;
                    const isOverdue = isPast(new Date(task.nextDueAt)) && !isToday(new Date(task.nextDueAt));

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl p-3 transition-all duration-400",
                          isDone
                            ? "bg-leaf/6 border border-leaf/15 opacity-70"
                            : isOverdue
                              ? "bg-surface border border-red-200/60"
                              : "bg-surface border border-border/40"
                        )}
                        style={!isDone ? { boxShadow: "var(--shadow-card)" } : undefined}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => !isDone && handleComplete(task.id)}
                          disabled={isDone || completeMutation.isPending}
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-250",
                            isDone
                              ? "border-leaf bg-leaf text-white scale-90"
                              : "border-border hover:border-leaf/50 active:scale-90"
                          )}
                        >
                          {isDone && <Check size={14} strokeWidth={3} />}
                        </button>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "truncate text-sm font-semibold leading-tight",
                                isDone && "line-through"
                              )}
                            >
                              {plantName}
                            </p>
                            {isOverdue && !isDone && (
                              <span className="shrink-0 rounded-md bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                                Просрочено
                              </span>
                            )}
                            {isDone && (
                              <span className="shrink-0 rounded-md bg-leaf/10 px-1.5 py-0.5 text-[9px] font-bold text-leaf">
                                Готово
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            {task.amount && <span>{task.amount}</span>}
                            {task.amount && <span className="text-dew">·</span>}
                            <span>{format(new Date(task.nextDueAt), "d MMM", { locale: ru })}</span>
                          </div>
                        </div>

                        {/* Thumbnail */}
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-greenhouse">
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Leaf size={16} className="text-stem/40" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

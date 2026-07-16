"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Leaf,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { CARE_TYPE_CONFIG } from "@/lib/care-types";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { ru } from "date-fns/locale";

const DAY_NAMES_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function CalendarPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const baseDate = useMemo(() => addMonths(new Date(), monthOffset), [monthOffset]);
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);

  // Calendar grid: start from Monday of the week containing monthStart
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const { data: logs } = trpc.logs.calendarRange.useQuery({
    from: gridStart,
    to: gridEnd,
  });

  // Group logs by date
  const logsByDay = useMemo(() => {
    const map = new Map<string, typeof allLogs>();
    const allLogs = logs ?? [];
    for (const log of allLogs) {
      const key = format(new Date(log.doneAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return map;
  }, [logs]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const selectedLogs = logsByDay.get(selectedKey) ?? [];
  const monthLabel = format(baseDate, "LLLL yyyy", { locale: ru });

  return (
    <div className="mx-auto max-w-md px-4 pt-12 pb-8 lg:max-w-3xl xl:max-w-4xl">
      {/* Header */}
      <div className="animate-fade-up flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Календарь</h1>
        <button
          onClick={() => {
            setMonthOffset(0);
            setSelectedDate(new Date());
          }}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
            monthOffset === 0
              ? "bg-leaf/10 text-leaf"
              : "bg-surface border border-border/50 text-muted-foreground hover:text-leaf"
          )}
        >
          Сегодня
        </button>
      </div>

      {/* Month + navigation */}
      <div
        className="animate-fade-up mt-5 flex items-center justify-between"
        style={{ animationDelay: "60ms" }}
      >
        <button
          onClick={() => setMonthOffset((p) => p - 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted active:scale-95"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-bold capitalize tracking-tight">{monthLabel}</p>
        <button
          onClick={() => setMonthOffset((p) => p + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted active:scale-95"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div
        className="animate-fade-up mt-4 grid grid-cols-7 gap-1"
        style={{ animationDelay: "90ms" }}
      >
        {DAY_NAMES_SHORT.map((name) => (
          <div
            key={name}
            className="flex items-center justify-center py-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div
        className="animate-fade-up grid grid-cols-7 gap-1"
        style={{ animationDelay: "120ms" }}
      >
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayLogs = logsByDay.get(key) ?? [];
          const isSelected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const inMonth = isSameMonth(day, baseDate);

          // Unique care types for dot indicators
          const uniqueTypes = [...new Set(dayLogs.map((l) => l.type))];

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 rounded-xl py-2 transition-all duration-200",
                isSelected
                  ? "bg-leaf text-white"
                  : today
                    ? "bg-greenhouse text-leaf"
                    : inMonth
                      ? "text-foreground hover:bg-greenhouse/60"
                      : "text-muted-foreground/30"
              )}
              style={
                isSelected ? { boxShadow: "0 2px 10px rgba(27,94,32,0.25)" } : undefined
              }
            >
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isSelected && "text-white"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Care type dots */}
              <div className="flex gap-[2px]">
                {uniqueTypes.slice(0, 3).map((type) => {
                  const config = CARE_TYPE_CONFIG[type];
                  return (
                    <div
                      key={type}
                      className="h-[4px] w-[4px] rounded-full"
                      style={{
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.7)"
                          : config?.color ?? "#5a7a5a",
                      }}
                    />
                  );
                })}
                {uniqueTypes.length > 3 && (
                  <div
                    className="h-[4px] w-[4px] rounded-full"
                    style={{
                      backgroundColor: isSelected
                        ? "rgba(255,255,255,0.5)"
                        : "#999",
                    }}
                  />
                )}
                {uniqueTypes.length === 0 && (
                  <div className="h-[4px] w-[4px] rounded-full bg-transparent" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider with selected date */}
      <div className="mt-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-xs font-semibold capitalize text-muted-foreground">
          {format(selectedDate, "EEEE, d MMMM", { locale: ru })}
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Care logs for selected day */}
      <div className="mt-4 space-y-2">
        {selectedLogs.length === 0 && (
          <div className="animate-scale-in flex flex-col items-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-greenhouse to-dew">
              <CalendarDays size={28} className="text-stem" />
            </div>
            <p className="mt-4 text-sm font-semibold">Нет записей</p>
            <p className="mt-1 text-xs text-muted-foreground">
              В этот день ничего не записано
            </p>
          </div>
        )}

        {selectedLogs.map((log) => {
          const config = CARE_TYPE_CONFIG[log.type];
          const TypeIcon = config?.icon;
          const plantName =
            log.plant.nickname ??
            log.plant.customName ??
            log.plant.species?.commonNameRu ??
            "Растение";
          const plantImage =
            log.plant.photos?.[0]?.url ??
            log.plant.species?.thumbnailUrl ??
            null;

          return (
            <Link
              key={log.id}
              href={`/plants/${log.plant.id}`}
              className="flex items-center gap-3 rounded-2xl bg-surface border border-border/40 p-3.5 transition-all hover:bg-muted/50"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {/* Plant photo */}
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-muted">
                {plantImage ? (
                  <img
                    src={plantImage}
                    alt={plantName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Leaf size={16} className="text-stem/50" />
                  </div>
                )}
              </div>

              {/* Type icon */}
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: config?.bgLight ?? "rgba(90,122,90,0.08)" }}
              >
                {TypeIcon && (
                  <TypeIcon size={14} style={{ color: config?.color }} />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{plantName}</p>
                <p className="text-xs text-muted-foreground">
                  {config?.label ?? log.type}
                  {log.note && <span> · {log.note}</span>}
                </p>
              </div>

              {/* Time */}
              <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                {format(new Date(log.doneAt), "HH:mm")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

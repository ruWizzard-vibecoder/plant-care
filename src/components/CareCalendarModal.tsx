"use client";

import { useState, useMemo } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
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

interface CareCalendarModalProps {
  open: boolean;
  onClose: () => void;
  plantId: string;
  type: string;
  typeLabel: string;
}

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CareCalendarModal({
  open,
  onClose,
  plantId,
  type,
  typeLabel,
}: CareCalendarModalProps) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const baseDate = useMemo(() => addMonths(new Date(), monthOffset), [monthOffset]);
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const utils = trpc.useUtils();

  const { data: logs } = trpc.logs.calendarRange.useQuery(
    { from: gridStart, to: gridEnd, plantId, type },
    { enabled: open }
  );

  const createLog = trpc.logs.create.useMutation({
    onSuccess: () => {
      utils.logs.calendarRange.invalidate();
      utils.plants.getById.invalidate({ id: plantId });
      utils.recommendations.forDashboard.invalidate();
    },
  });

  // Group logs by date
  const logsByDay = useMemo(() => {
    const map = new Map<string, NonNullable<typeof logs>>();
    for (const log of logs ?? []) {
      const key = format(new Date(log.doneAt), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    return map;
  }, [logs]);

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedLogs = selectedKey ? logsByDay.get(selectedKey) ?? [] : [];

  const config = CARE_TYPE_CONFIG[type];
  const TypeIcon = config?.icon;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md animate-in slide-in-from-bottom duration-300 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:max-w-lg lg:slide-in-from-bottom-0 lg:zoom-in-95">
        <div className="rounded-t-3xl bg-background border-t border-border/50 px-5 pb-8 pt-4 lg:rounded-3xl lg:border lg:pb-5">
          {/* Handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border/60 lg:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {TypeIcon && (
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: config?.bgLight }}
                >
                  <TypeIcon size={14} style={{ color: config?.color }} />
                </div>
              )}
              <h3 className="text-base font-bold">{typeLabel}</h3>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
            >
              <X size={16} />
            </button>
          </div>

          {/* Month navigation */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setMonthOffset((p) => p - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-border/50 transition-colors hover:bg-muted"
            >
              <ChevronLeft size={14} />
            </button>
            <p className="text-xs font-bold capitalize">
              {format(baseDate, "LLLL yyyy", { locale: ru })}
            </p>
            <button
              onClick={() => setMonthOffset((p) => p + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface border border-border/50 transition-colors hover:bg-muted"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day headers */}
          <div className="mt-3 grid grid-cols-7 gap-1">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="flex items-center justify-center py-0.5 text-[9px] font-semibold tracking-wider uppercase text-muted-foreground"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayLogs = logsByDay.get(key) ?? [];
              const hasLogs = dayLogs.length > 0;
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);
              const inMonth = isSameMonth(day, baseDate);

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative flex h-9 items-center justify-center rounded-lg text-xs font-medium transition-all",
                    isSelected
                      ? "text-white"
                      : today
                        ? "bg-greenhouse text-leaf font-bold"
                        : inMonth
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground/25"
                  )}
                  style={
                    isSelected
                      ? { backgroundColor: config?.color ?? "#1B5E20", boxShadow: `0 2px 8px ${config?.color ?? "#1B5E20"}40` }
                      : undefined
                  }
                >
                  {format(day, "d")}
                  {hasLogs && !isSelected && (
                    <div
                      className="absolute bottom-0.5 h-1 w-1 rounded-full"
                      style={{ backgroundColor: config?.color ?? "#1B5E20" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day details */}
          {selectedDate && (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {format(selectedDate, "d MMMM yyyy", { locale: ru })}
              </p>
              {selectedLogs.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {selectedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-2 rounded-xl bg-surface border border-border/30 px-3 py-2"
                    >
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: config?.color }}
                      />
                      <span className="text-xs font-medium">
                        {format(new Date(log.doneAt), "HH:mm")}
                      </span>
                      {log.note && (
                        <span className="truncate text-xs text-muted-foreground">
                          {log.note}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground/60 italic">
                  Нет записей за этот день
                </p>
              )}
            </div>
          )}

          {/* Log action button */}
          <button
            onClick={() => {
              createLog.mutate({
                plantId,
                type: type as "WATER" | "SPRAY" | "FERTILIZE_MINERAL" | "FERTILIZE_ORGANIC" | "REPOT" | "PRUNE",
              });
            }}
            disabled={createLog.isPending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ boxShadow: "0 2px 12px rgba(27,94,32,0.25)" }}
          >
            {createLog.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Записать {typeLabel.toLowerCase()}
          </button>
        </div>
      </div>
    </>
  );
}

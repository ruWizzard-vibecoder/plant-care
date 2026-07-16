"use client";

import { useMemo } from "react";
import { X, TrendingUp, Droplets, Ruler, Leaf as LeafIcon } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { trpc } from "@/trpc/client";

interface Props {
  myPlantId: string;
  friendPlantId: string;
  onClose: () => void;
}

export function GrowthComparisonModal({ myPlantId, friendPlantId, onClose }: Props) {
  const { data, isLoading } = trpc.friends.compareGrowth.useQuery(
    { myPlantId, friendPlantId },
    { enabled: !!myPlantId && !!friendPlantId }
  );

  // Merge records into a single timeline for the chart
  const chartData = useMemo(() => {
    if (!data) return [];

    const allDates = new Map<string, { date: string; my?: number; friend?: number }>();

    for (const r of data.myPlant.records) {
      if (r.heightCm == null) continue;
      const key = new Date(r.recordedAt).toISOString().slice(0, 10);
      const label = format(new Date(r.recordedAt), "d MMM", { locale: ru });
      const existing = allDates.get(key);
      if (existing) {
        existing.my = r.heightCm;
      } else {
        allDates.set(key, { date: label, my: r.heightCm });
      }
    }

    for (const r of data.friendPlant.records) {
      if (r.heightCm == null) continue;
      const key = new Date(r.recordedAt).toISOString().slice(0, 10);
      const label = format(new Date(r.recordedAt), "d MMM", { locale: ru });
      const existing = allDates.get(key);
      if (existing) {
        existing.friend = r.heightCm;
      } else {
        allDates.set(key, { date: label, friend: r.heightCm });
      }
    }

    return [...allDates.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [data]);

  const hasChartData = chartData.some((d) => d.my != null) && chartData.some((d) => d.friend != null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 animate-fade-in" />
      <div
        className="relative w-full max-w-md animate-sheet rounded-t-3xl bg-surface pb-safe-area-bottom lg:rounded-3xl lg:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 lg:pt-4">
          <h3 className="text-base font-bold">Сравнение роста</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-leaf border-t-transparent" />
          </div>
        ) : !data ? (
          <div className="px-5 pb-8 text-center text-sm text-muted-foreground">
            Не удалось загрузить данные
          </div>
        ) : (
          <div className="px-5 pb-6 space-y-5">
            {/* Plants side by side */}
            <div className="grid grid-cols-2 gap-3">
              <PlantMiniCard
                name={data.myPlant.name}
                photo={data.myPlant.photo}
                label="Ваше"
                color="#1B5E20"
              />
              <PlantMiniCard
                name={data.friendPlant.name}
                photo={data.friendPlant.photo}
                label={data.friendPlant.ownerName}
                color="#3B82F6"
              />
            </div>

            {/* Growth chart */}
            {hasChartData && chartData.length >= 2 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(200,230,201,0.4)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9, fill: "#9e9e9e" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "#9e9e9e" }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid rgba(200,230,201,0.6)",
                        borderRadius: 12,
                        fontSize: 11,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        padding: "6px 10px",
                      }}
                      formatter={(value: number | undefined) => [`${value ?? 0} см`]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={6}
                      wrapperStyle={{ fontSize: 10 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="my"
                      name="Ваше"
                      stroke="#1B5E20"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#1B5E20", strokeWidth: 0 }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="friend"
                      name={data.friendPlant.ownerName}
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#3B82F6", strokeWidth: 0 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-xl bg-muted/50 px-4 py-6 text-center">
                <Ruler size={20} className="mx-auto text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Недостаточно данных для графика.<br />
                  Нужны измерения высоты у обоих растений.
                </p>
              </div>
            )}

            {/* Stats comparison table */}
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Показатель</th>
                    <th className="px-3 py-2 text-center font-medium text-[#1B5E20]">Ваше</th>
                    <th className="px-3 py-2 text-center font-medium text-[#3B82F6]">Друга</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  <StatRow
                    icon={<TrendingUp size={12} />}
                    label="Рост"
                    my={data.myPlant.growthPct != null ? `+${data.myPlant.growthPct}%` : "—"}
                    friend={data.friendPlant.growthPct != null ? `+${data.friendPlant.growthPct}%` : "—"}
                  />
                  <StatRow
                    icon={<Ruler size={12} />}
                    label="Измерений"
                    my={String(data.myPlant.records.length)}
                    friend={String(data.friendPlant.records.length)}
                  />
                  <StatRow
                    icon={<LeafIcon size={12} />}
                    label="Листья"
                    my={lastLeafCount(data.myPlant.records)}
                    friend={lastLeafCount(data.friendPlant.records)}
                  />
                  <StatRow
                    icon={<Droplets size={12} />}
                    label="Действия ухода"
                    my={String(data.myPlant.careCount)}
                    friend={String(data.friendPlant.careCount)}
                  />
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlantMiniCard({
  name,
  photo,
  label,
  color,
}: {
  name: string;
  photo: string | null;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border/30 p-3">
      <div
        className="h-16 w-16 rounded-xl bg-muted overflow-hidden"
        style={{ borderColor: color, borderWidth: 2 }}
      >
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <LeafIcon size={20} className="text-muted-foreground" />
          </div>
        )}
      </div>
      <p className="text-[10px] font-semibold text-center leading-tight truncate w-full">{name}</p>
      <span className="text-[9px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color }}>
        {label}
      </span>
    </div>
  );
}

function StatRow({
  icon,
  label,
  my,
  friend,
}: {
  icon: React.ReactNode;
  label: string;
  my: string;
  friend: string;
}) {
  return (
    <tr>
      <td className="px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon} {label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-center font-semibold">{my}</td>
      <td className="px-3 py-2.5 text-center font-semibold">{friend}</td>
    </tr>
  );
}

function lastLeafCount(records: { leafCount: number | null }[]): string {
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].leafCount != null) return String(records[i].leafCount);
  }
  return "—";
}

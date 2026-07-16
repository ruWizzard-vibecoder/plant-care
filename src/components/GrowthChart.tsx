"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface GrowthRecord {
  id: string;
  recordedAt: string | Date;
  heightCm: number | null;
  leafCount: number | null;
  diameterCm: number | null;
}

interface GrowthChartProps {
  records: GrowthRecord[];
  metric: "height" | "leaves";
}

export function GrowthChart({ records, metric }: GrowthChartProps) {
  const data = useMemo(() => {
    return [...records]
      .sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      )
      .map((r) => ({
        date: format(new Date(r.recordedAt), "d MMM", { locale: ru }),
        value:
          metric === "height"
            ? r.heightCm
            : r.leafCount,
      }))
      .filter((d) => d.value != null);
  }, [records, metric]);

  if (data.length < 2) return null;

  const color = metric === "height" ? "#1B5E20" : "#2E7D32";
  const unit = metric === "height" ? " см" : " шт";

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(200,230,201,0.4)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#9e9e9e" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9e9e9e" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid rgba(200,230,201,0.6)",
              borderRadius: 12,
              fontSize: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              padding: "6px 10px",
            }}
            formatter={(value: number | undefined) => [`${value ?? 0}${unit}`, metric === "height" ? "Высота" : "Листья"]}
            labelStyle={{ fontSize: 10, color: "#9e9e9e" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#grad-${metric})`}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: "white" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

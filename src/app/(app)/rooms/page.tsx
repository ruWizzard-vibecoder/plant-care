"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Thermometer,
  Droplets,
  Sun,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  Home,
  Leaf,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

function formatTimeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} д назад`;
}

export default function RoomsPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const utils = trpc.useUtils();
  const { data: rooms, isLoading } = trpc.rooms.list.useQuery();

  const createMutation = trpc.rooms.create.useMutation({
    onSuccess: () => {
      utils.rooms.list.invalidate();
      setShowAdd(false);
    },
  });
  const updateMutation = trpc.rooms.update.useMutation({
    onSuccess: () => {
      utils.rooms.list.invalidate();
      setEditingId(null);
    },
  });
  const deleteMutation = trpc.rooms.delete.useMutation({
    onSuccess: () => utils.rooms.list.invalidate(),
  });

  return (
    <div className="mx-auto max-w-md px-4 pt-12 pb-8 lg:max-w-2xl">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between">
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-base font-semibold">Комнаты</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf text-white transition-colors hover:bg-leaf-light active:scale-95"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <RoomForm
          className="animate-fade-up mt-4"
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setShowAdd(false)}
          isPending={createMutation.isPending}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {rooms && rooms.length === 0 && !showAdd && (
        <div className="animate-fade-up mt-12 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf/10">
            <Home size={28} className="text-leaf" />
          </div>
          <p className="mt-4 text-sm font-semibold">Пока нет комнат</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Добавьте комнаты, чтобы отслеживать условия для растений
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-leaf px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-leaf-light active:scale-95"
          >
            <Plus size={14} />
            Добавить комнату
          </button>
        </div>
      )}

      {/* Rooms list */}
      {rooms && rooms.length > 0 && (
        <div className="mt-6 space-y-3">
          {rooms.map((room, idx) => (
            <div
              key={room.id}
              className="animate-fade-up rounded-2xl bg-surface border border-border/30 overflow-hidden"
              style={{ animationDelay: `${idx * 60}ms`, boxShadow: "var(--shadow-card)" }}
            >
              {editingId === room.id ? (
                <RoomForm
                  initial={{
                    name: room.name,
                    tempC: room.tempC ?? undefined,
                    humidityPct: room.humidityPct ?? undefined,
                    lightLux: room.lightLux ?? undefined,
                    sensorDeviceId: room.sensorDeviceId ?? undefined,
                  }}
                  onSubmit={(data) => updateMutation.mutate({ id: room.id, ...data })}
                  onCancel={() => setEditingId(null)}
                  isPending={updateMutation.isPending}
                />
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf/10">
                        <Home size={18} className="text-leaf" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{room.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {room.plants.length > 0
                            ? `${room.plants.length} растени${room.plants.length === 1 ? "е" : room.plants.length < 5 ? "я" : "й"}`
                            : "Нет растений"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingId(room.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                      >
                        <Pencil size={14} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Удалить комнату?")) {
                            deleteMutation.mutate({ id: room.id });
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Sensor readings */}
                  <div className="mt-3 flex gap-2">
                    <SensorChip
                      icon={Thermometer}
                      value={room.tempC != null ? `${room.tempC}°C` : "—"}
                      color="#FF6D00"
                    />
                    <SensorChip
                      icon={Droplets}
                      value={room.humidityPct != null ? `${room.humidityPct}%` : "—"}
                      color="#1E88E5"
                    />
                    <SensorChip
                      icon={Sun}
                      value={room.lightLux != null ? `${room.lightLux} lx` : "—"}
                      color="#FF8F00"
                    />
                  </div>

                  {/* Smart home device info */}
                  {room.sensorDeviceId && (
                    <SensorBadge
                      roomId={room.id}
                      sensorUpdatedAt={room.sensorUpdatedAt}
                    />
                  )}

                  {/* Plants in room */}
                  {room.plants.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {room.plants.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-greenhouse/60 px-2 py-1 text-[10px] font-medium text-leaf"
                        >
                          <Leaf size={9} />
                          {p.nickname ?? p.customName ?? "Растение"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========== Sensor chip ========== */

function SensorChip({
  icon: Icon,
  value,
  color,
}: {
  icon: typeof Thermometer;
  value: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5"
      style={{ backgroundColor: `${color}08` }}
    >
      <Icon size={12} style={{ color }} strokeWidth={2.2} />
      <span className="text-[11px] font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

/* ========== Sensor Badge ========== */

function SensorBadge({
  roomId,
  sensorUpdatedAt,
}: {
  roomId: string;
  sensorUpdatedAt: Date | null;
}) {
  const utils = trpc.useUtils();
  const pollMutation = trpc.smartHome.pollRoom.useMutation({
    onSuccess: () => utils.rooms.list.invalidate(),
  });

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1">
        <Smartphone size={10} className="text-purple-500" />
        <span className="text-[10px] font-medium text-purple-600">Яндекс</span>
        {sensorUpdatedAt && (
          <span className="text-[9px] text-purple-400 ml-0.5">
            {formatTimeAgo(sensorUpdatedAt)}
          </span>
        )}
      </div>
      <button
        onClick={() => pollMutation.mutate({ roomId })}
        disabled={pollMutation.isPending}
        className="flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-600 transition-colors hover:bg-purple-100 active:scale-95 disabled:opacity-40"
      >
        <RefreshCw size={10} className={pollMutation.isPending ? "animate-spin" : ""} />
        Обновить
      </button>
    </div>
  );
}

/* ========== Room Form (create/edit) ========== */

function RoomForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  className,
}: {
  initial?: {
    name?: string;
    tempC?: number;
    humidityPct?: number;
    lightLux?: number;
    sensorDeviceId?: string;
  };
  onSubmit: (data: {
    name: string;
    tempC?: number;
    humidityPct?: number;
    lightLux?: number;
    sensorDeviceId?: string | null;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
  className?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tempC, setTempC] = useState(initial?.tempC?.toString() ?? "");
  const [humidityPct, setHumidityPct] = useState(initial?.humidityPct?.toString() ?? "");
  const [lightLux, setLightLux] = useState(initial?.lightLux?.toString() ?? "");
  const [sensorDeviceId, setSensorDeviceId] = useState(initial?.sensorDeviceId ?? "");

  const { data: smartHomeData } = trpc.smartHome.devices.useQuery();

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      tempC: tempC ? parseFloat(tempC) : undefined,
      humidityPct: humidityPct ? parseFloat(humidityPct) : undefined,
      lightLux: lightLux ? parseFloat(lightLux) : undefined,
      sensorDeviceId: sensorDeviceId || null,
    });
  };

  return (
    <div className={cn("rounded-2xl bg-surface border border-border/30 p-4 space-y-3", className)} style={{ boxShadow: "var(--shadow-card)" }}>
      <div>
        <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Название</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Гостиная, Спальня..."
          className="w-full rounded-xl border border-border/60 bg-surface py-2.5 px-3 text-sm focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Thermometer size={10} className="text-orange-500" />
            °C
          </label>
          <input
            type="number"
            value={tempC}
            onChange={(e) => setTempC(e.target.value)}
            placeholder="22"
            className="w-full rounded-xl border border-border/60 bg-surface py-2 px-2.5 text-sm text-center focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Droplets size={10} className="text-blue-500" />
            %
          </label>
          <input
            type="number"
            value={humidityPct}
            onChange={(e) => setHumidityPct(e.target.value)}
            placeholder="50"
            className="w-full rounded-xl border border-border/60 bg-surface py-2 px-2.5 text-sm text-center focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
          />
        </div>
        <div>
          <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Sun size={10} className="text-amber-500" />
            lx
          </label>
          <input
            type="number"
            value={lightLux}
            onChange={(e) => setLightLux(e.target.value)}
            placeholder="500"
            className="w-full rounded-xl border border-border/60 bg-surface py-2 px-2.5 text-sm text-center focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
          />
        </div>
      </div>

      {/* Smart home device selector */}
      {smartHomeData?.configured ? (
        <div>
          <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Smartphone size={10} className="text-purple-500" />
            Датчик (Яндекс)
          </label>
          <select
            value={sensorDeviceId}
            onChange={(e) => setSensorDeviceId(e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-surface py-2 px-2.5 text-sm focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
          >
            <option value="">Не подключён</option>
            {smartHomeData.devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.room ? `(${d.room})` : ""} {d.tempC != null ? `${d.tempC}°C` : ""} {d.humidityPct != null ? `${d.humidityPct}%` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="rounded-xl bg-purple-50/50 border border-purple-100 px-3 py-2.5">
          <p className="text-[11px] text-purple-600">
            <Smartphone size={10} className="inline mr-1 -mt-0.5" />
            Подключите <Link href="/profile" className="font-semibold underline underline-offset-2">Яндекс в Профиле</Link> для автоматических датчиков
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-border/50 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
        >
          <X size={12} />
          Отмена
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-leaf py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Сохранить
        </button>
      </div>
    </div>
  );
}

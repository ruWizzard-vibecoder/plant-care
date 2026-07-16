"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Sparkles,
  Bell,
  Leaf,
  Thermometer,
  Droplets,
  Trophy,
  Heart,
} from "lucide-react";
import { PlantCard } from "@/components/plants/PlantCard";
import { trpc } from "@/trpc/client";

const PLANT_FACTS = [
  "Растения общаются друг с другом через подземные грибковые сети — «лесной интернет».",
  "Алоэ вера может выживать без полива до 3 недель благодаря запасам воды в листьях.",
  "Монстера создаёт отверстия в листьях, чтобы свет проходил к нижним ярусам.",
  "Комнатные растения могут снизить уровень стресса на 37% — по данным NASA.",
  "Суккуленты могут выжить при температуре до +40°C благодаря CAM-фотосинтезу.",
  "Фикус Бенджамина очищает воздух от формальдегида и бензола.",
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}


export default function DashboardPage() {
  const [factIndex] = useState(() => Math.floor(Math.random() * PLANT_FACTS.length));

  const { data: plants } = trpc.plants.list.useQuery();
  const { data: rooms } = trpc.rooms.list.useQuery();
  const { data: achievementsData } = trpc.achievements.list.useQuery();
  const { data: feedData } = trpc.friends.activityFeed.useQuery();
  const { data: wishlistCount } = trpc.wishlist.count.useQuery();

  const favorites = (plants ?? []).filter((p) => p.isFavorite);
  const displayPlants = favorites.length > 0 ? favorites : (plants ?? []).slice(0, 4);

  // Recent unlocked achievements (last 4)
  const recentAchievements = achievementsData?.achievements
    .filter((a) => a.unlockedAt)
    .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
    .slice(0, 4) ?? [];

  return (
    <div className="stagger mx-auto max-w-md px-4 pt-12 lg:max-w-5xl lg:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-x-8 xl:max-w-6xl 2xl:max-w-7xl">
      {/* Header */}
      <div className="animate-fade-up flex items-start justify-between lg:col-span-2">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {getGreeting()},
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
            Мой сад
            <span className="ml-1 inline-block animate-[gentlePulse_3s_ease-in-out_infinite]">
              🌿
            </span>
          </h1>
        </div>

        <button className="relative mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border/50 transition-colors hover:bg-muted">
          <Bell size={18} className="text-foreground-secondary" />
        </button>
      </div>

      {/* Right rail on desktop: fact + widgets + microclimate (display:contents keeps mobile flow intact) */}
      <div className="contents lg:block lg:col-start-2 lg:row-start-2">
      {/* "Did You Know" card */}
      <div
        className="animate-fade-up mt-6 relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-leaf via-leaf-light to-leaf-muted p-5 text-white"
        style={{ animationDelay: "60ms" }}
      >
        <svg className="absolute -right-6 -top-6 h-32 w-32 opacity-10" viewBox="0 0 128 128" fill="currentColor">
          <path d="M64 0C64 0 0 40 0 80C0 120 40 128 64 128C88 128 128 120 128 80C128 40 64 0 64 0Z" />
        </svg>
        <svg className="absolute -bottom-4 -left-4 h-24 w-24 opacity-10 rotate-180" viewBox="0 0 128 128" fill="currentColor">
          <path d="M64 0C64 0 0 40 0 80C0 120 40 128 64 128C88 128 128 120 128 80C128 40 64 0 64 0Z" />
        </svg>

        <div className="relative z-10">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-stem" />
            <span className="text-xs font-semibold tracking-wider uppercase text-white/80">Вы знали?</span>
          </div>
          <p className="mt-2 text-sm font-medium leading-relaxed text-white/95">
            {PLANT_FACTS[factIndex]}
          </p>
        </div>
      </div>

      {/* Achievements widget */}
      {recentAchievements.length > 0 && (
        <Link href="/achievements" className="animate-fade-up mt-5 block" style={{ animationDelay: "90ms" }}>
          <div className="rounded-2xl bg-surface border border-border/30 p-3.5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" />
                <span className="text-xs font-bold">Достижения</span>
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                  {achievementsData?.achievements.filter((a) => a.unlockedAt).length ?? 0}/{achievementsData?.achievements.length ?? 0}
                </span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {recentAchievements.map((a) => (
                <div key={a.type} className="flex flex-col items-center gap-0.5 min-w-[52px]">
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-[8px] font-medium text-muted-foreground text-center leading-tight">
                    {a.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Link>
      )}

      {/* Wishlist widget */}
      {!!wishlistCount && wishlistCount > 0 && (
        <Link href="/wishlist" className="animate-fade-up mt-3 block" style={{ animationDelay: "97ms" }}>
          <div className="rounded-2xl bg-surface border border-border/30 p-3.5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart size={14} className="text-rose-500" fill="currentColor" />
                <span className="text-xs font-bold">Список желаний</span>
                <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                  {wishlistCount}
                </span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </div>
        </Link>
      )}

      {/* Friend activity */}
      {feedData && feedData.length > 0 && (
        <Link href="/friends" className="animate-fade-up mt-3 block" style={{ animationDelay: "105ms" }}>
          <div className="rounded-2xl bg-surface border border-border/30 p-3.5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">👥</span>
              <span className="text-xs font-bold">Активность друзей</span>
            </div>
            {feedData.slice(0, 2).map((item, i) => (
              <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{item.userName}</span>
                {" "}
                {item.type === "plant" && `добавил(а) ${item.detail}`}
                {item.type === "achievement" && "получил(а) достижение"}
                {item.type === "propagation" && `размножает ${item.detail}`}
              </p>
            ))}
          </div>
        </Link>
      )}

      {/* Room environment */}
      {rooms && rooms.some((r) => r.tempC != null || r.humidityPct != null) && (
        <div className="animate-fade-up mt-6" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Микроклимат</h2>
            <Link
              href="/rooms"
              className="flex items-center gap-0.5 text-xs font-semibold text-leaf transition-colors hover:text-leaf-light"
            >
              Комнаты <ChevronRight size={14} />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {rooms.filter((r) => r.tempC != null || r.humidityPct != null).map((room) => (
              <div
                key={room.id}
                className="rounded-2xl bg-surface border border-border/40 p-4"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <p className="text-sm font-semibold">{room.name}</p>
                {room.tempC != null && (
                  <div className="mt-3 flex items-center gap-1.5 text-amber-600">
                    <Thermometer size={14} />
                    <span className="text-lg font-bold leading-none">
                      {room.tempC > 0 ? "+" : ""}{room.tempC}°
                    </span>
                  </div>
                )}
                {room.humidityPct != null && (
                  <div className="mt-2 flex items-center gap-1.5 text-sky-500">
                    <Droplets size={14} />
                    <span className="text-sm font-semibold leading-none">{room.humidityPct}%</span>
                  </div>
                )}
                {room.sensorUpdatedAt && (
                  <p className="mt-2 text-[9px] text-muted-foreground/60">
                    {(() => {
                      const mins = Math.floor((Date.now() - new Date(room.sensorUpdatedAt).getTime()) / 60000);
                      if (mins < 1) return "только что";
                      if (mins < 60) return `${mins} мин назад`;
                      const hours = Math.floor(mins / 60);
                      if (hours < 24) return `${hours} ч назад`;
                      return `${Math.floor(hours / 24)} д назад`;
                    })()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Main column on desktop: plant list */}
      <div className="contents lg:block lg:col-start-1 lg:row-start-2 lg:min-w-0">
      {/* My Plants */}
      <div className="animate-fade-up mt-8 pb-6 lg:mt-6" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Мои растения</h2>
          <Link
            href="/plants"
            className="flex items-center gap-0.5 text-xs font-semibold text-leaf transition-colors hover:text-leaf-light"
          >
            Все <ChevronRight size={14} />
          </Link>
        </div>

        {!plants && (
          <div className="mt-3 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-[var(--radius-card)] bg-muted" />
            ))}
          </div>
        )}

        {plants && displayPlants.length > 0 && (
          <div className="stagger mt-3 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {displayPlants.map((plant) => (
              <PlantCard
                key={plant.id}
                id={plant.id}
                name={plant.nickname ?? plant.customName ?? plant.species?.commonNameRu ?? "Растение"}
                species={plant.species?.scientificName}
                imageUrl={plant.photos[0]?.url ?? plant.species?.thumbnailUrl ?? plant.species?.imageUrl}
                waterNeed={plant.species?.waterNeed}
                lightNeed={plant.species?.lightNeed}
                isFavorite={plant.isFavorite}
                className="animate-fade-up"
              />
            ))}
          </div>
        )}

        {plants && displayPlants.length === 0 && (
          <div className="mt-4 flex flex-col items-center rounded-2xl bg-surface border border-border/40 py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-leaf/10">
              <Leaf size={24} className="text-leaf" />
            </div>
            <p className="mt-3 text-sm font-semibold">Пока нет растений</p>
            <p className="mt-1 text-xs text-muted-foreground">Добавьте первое через сканер</p>
            <Link
              href="/scanner"
              className="mt-4 rounded-xl bg-leaf px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-leaf-light"
            >
              Сканировать растение
            </Link>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

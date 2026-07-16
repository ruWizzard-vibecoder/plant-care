"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sun,
  Droplets,
  Thermometer,
  Wind,
  Sprout,
  ShieldAlert,
  Plus,
  Loader2,
  Calendar,
  Leaf,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { PLANT_CATEGORIES } from "@/lib/care-types";
import { WishlistButton } from "@/components/WishlistButton";

function NeedBar({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-1.5 w-4 rounded-full transition-colors"
          style={{
            backgroundColor: i <= level ? color : "rgba(200,230,201,0.4)",
          }}
        />
      ))}
    </div>
  );
}

function needLabel(level: number) {
  if (level >= 5) return "Очень высокий";
  if (level >= 4) return "Высокий";
  if (level >= 3) return "Средний";
  if (level >= 2) return "Низкий";
  return "Минимальный";
}

export default function SpeciesDetailPage() {
  const params = useParams<{ speciesId: string }>();
  const router = useRouter();
  const { data: species, isLoading } = trpc.species.getById.useQuery({ id: params.speciesId });

  const createPlant = trpc.plants.create.useMutation({
    onSuccess: () => router.push("/plants"),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12 lg:max-w-3xl">
        <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
        <div className="mt-4 h-72 animate-pulse rounded-3xl bg-muted" />
        <div className="mt-4 h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!species) return null;

  const tags: string[] = Array.isArray(species.tags) ? (species.tags as string[]) : [];

  const careRequirements = [
    { icon: Sun, label: "Свет", value: needLabel(species.lightNeed), level: species.lightNeed, color: "#FF8F00" },
    { icon: Droplets, label: "Полив", value: needLabel(species.waterNeed), level: species.waterNeed, color: "#1E88E5" },
    { icon: Wind, label: "Влажность", value: needLabel(species.humidityNeed), level: species.humidityNeed, color: "#42A5F5" },
  ];

  const careSchedule = [
    { label: "Полив", value: `каждые ${species.wateringFreqDays} дн.`, icon: Droplets, color: "#1E88E5" },
    { label: "Мин. удобрение", value: `каждые ${species.fertilizingFreqDays} дн.`, icon: Sprout, color: "#E65100" },
    { label: "Орг. удобрение", value: `каждые ${species.fertilizingOrganicFreqDays} дн.`, icon: Leaf, color: "#795548" },
    { label: "Пересадка", value: `каждые ${species.repottingFreqDays} дн.`, icon: Calendar, color: "#BF360C" },
  ];

  return (
    <div className="mx-auto max-w-md lg:max-w-3xl xl:max-w-4xl">
      {/* Top nav */}
      <div className="animate-fade-in flex items-center justify-between px-4 pt-12">
        <Link
          href="/catalog"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-base font-semibold">Каталог</h2>
        <div className="w-9" />
      </div>

      {/* Hero image */}
      <div className="animate-scale-in mx-4 mt-4 overflow-hidden rounded-3xl bg-gradient-to-b from-muted to-greenhouse">
        {species.imageUrl || species.thumbnailUrl ? (
          <img
            src={species.imageUrl ?? species.thumbnailUrl!}
            alt={species.commonNameRu}
            className="h-72 w-full object-cover"
          />
        ) : (
          <div className="flex h-72 items-center justify-center">
            <Leaf size={64} className="text-stem/20" />
          </div>
        )}
      </div>

      {/* Name + category */}
      <div className="animate-fade-up px-4 mt-4" style={{ animationDelay: "100ms" }}>
        <h1 className="text-xl font-bold tracking-tight">{species.commonNameRu}</h1>
        <p className="mt-0.5 text-xs tracking-widest text-muted-foreground uppercase italic">
          {species.scientificName}
        </p>
        {species.family && (
          <p className="mt-1 text-xs text-muted-foreground">
            Семейство: {species.family}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {species.category && PLANT_CATEGORIES[species.category] && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-leaf/10 px-2 py-0.5 text-[10px] font-bold text-leaf">
              <Tag size={9} />
              {PLANT_CATEGORIES[species.category]}
            </span>
          )}
          {species.toxicToPets && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
              <ShieldAlert size={9} />
              Токсичен для животных
            </span>
          )}
          {species.toxicToHumans && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
              <ShieldAlert size={9} />
              Токсичен для людей
            </span>
          )}
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Care requirements */}
      <div className="animate-fade-up px-4 mt-5" style={{ animationDelay: "160ms" }}>
        <h3 className="text-sm font-bold">Потребности</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {careRequirements.map((req) => (
            <div
              key={req.label}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface border border-border/30 p-3"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: `${req.color}15` }}
              >
                <req.icon size={15} style={{ color: req.color }} strokeWidth={2} />
              </div>
              <NeedBar level={req.level} color={req.color} />
              <span className="text-[10px] font-bold text-center" style={{ color: req.color }}>
                {req.value}
              </span>
              <span className="text-[9px] text-muted-foreground">{req.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Care schedule */}
      <div className="animate-fade-up px-4 mt-5" style={{ animationDelay: "220ms" }}>
        <h3 className="text-sm font-bold">Расписание ухода</h3>
        <div className="mt-3 space-y-2">
          {careSchedule.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-2xl bg-surface border border-border/30 p-3"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${item.color}12` }}
              >
                <item.icon size={14} style={{ color: item.color }} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      {species.description && (
        <div className="animate-fade-up px-4 mt-5" style={{ animationDelay: "280ms" }}>
          <h3 className="text-sm font-bold">Описание</h3>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground-secondary">
            {species.description.split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      )}

      {/* Toxicity warning */}
      {(species.toxicToPets || species.toxicToHumans) && (
        <div className="animate-fade-up px-4 mt-5" style={{ animationDelay: "320ms" }}>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
                <ShieldAlert size={18} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-700">Внимание: токсичное растение</p>
                <ul className="mt-1.5 space-y-1">
                  {species.toxicToPets && (
                    <li className="text-xs text-red-600">
                      Опасно для кошек, собак и других домашних животных
                    </li>
                  )}
                  {species.toxicToHumans && (
                    <li className="text-xs text-red-600">
                      Опасно для людей при попадании внутрь
                    </li>
                  )}
                </ul>
                <p className="mt-2 text-[11px] text-red-500">
                  Держите растение в недоступном месте. При контакте с соком используйте перчатки.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to garden + wishlist buttons */}
      <div className="animate-fade-up px-4 mt-6 pb-8 space-y-2" style={{ animationDelay: "340ms" }}>
        <button
          onClick={() => createPlant.mutate({ speciesId: species.id })}
          disabled={createPlant.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-leaf py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ boxShadow: "0 4px 16px rgba(27,94,32,0.25)" }}
        >
          {createPlant.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Plus size={18} />
          )}
          Добавить в мой сад
        </button>
        <WishlistButton speciesId={species.id} variant="full" />
      </div>
    </div>
  );
}

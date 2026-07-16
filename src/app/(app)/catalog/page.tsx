"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Sun,
  Droplets,
  Wind,
  Plus,
  Leaf,
  BookOpen,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { PLANT_CATEGORIES } from "@/lib/care-types";
import { WishlistButton } from "@/components/WishlistButton";

function NeedDots({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex gap-[3px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-[5px] w-[5px] rounded-full transition-colors"
          style={{
            backgroundColor: i <= level ? color : "rgba(200,230,201,0.5)",
          }}
        />
      ))}
    </div>
  );
}

// Deterministic plant SVG variations based on species id
function PlantSvg({ seed }: { seed: string }) {
  const n = seed.charCodeAt(0) + (seed.charCodeAt(1) || 0);
  const variant = n % 4;

  const paths = [
    // Upright leaves
    <>
      <path d="M32 58V24" strokeLinecap="round" />
      <path d="M32 24C32 24 18 18 14 8C10 -2 22 -2 28 6C34 14 32 24 32 24Z" fill="currentColor" opacity="0.12" />
      <path d="M32 34C32 34 46 28 50 18C54 8 42 6 36 14C30 22 32 34 32 34Z" fill="currentColor" opacity="0.08" />
    </>,
    // Round bush
    <>
      <path d="M32 58V36" strokeLinecap="round" />
      <ellipse cx="32" cy="24" rx="18" ry="16" fill="currentColor" opacity="0.08" />
      <ellipse cx="26" cy="20" rx="10" ry="10" fill="currentColor" opacity="0.06" />
      <ellipse cx="38" cy="22" rx="10" ry="10" fill="currentColor" opacity="0.06" />
    </>,
    // Drooping leaves
    <>
      <path d="M32 58V28" strokeLinecap="round" />
      <path d="M32 28C32 28 16 22 10 10C4 -2 18 -4 26 8C34 20 32 28 32 28Z" fill="currentColor" opacity="0.1" />
      <path d="M32 32C32 32 48 30 52 20C56 10 44 8 38 16C32 24 32 32 32 32Z" fill="currentColor" opacity="0.08" />
      <path d="M32 40C32 40 20 38 16 30C12 22 22 20 28 28C34 36 32 40 32 40Z" fill="currentColor" opacity="0.06" />
    </>,
    // Succulent
    <>
      <path d="M32 58V40" strokeLinecap="round" />
      <path d="M32 40C32 40 20 36 16 26C12 16 24 14 30 22C36 30 32 40 32 40Z" fill="currentColor" opacity="0.1" />
      <path d="M32 40C32 40 44 36 48 26C52 16 40 14 34 22C28 30 32 40 32 40Z" fill="currentColor" opacity="0.08" />
      <path d="M32 36C32 36 26 30 26 22C26 14 34 14 34 22C34 30 32 36 32 36Z" fill="currentColor" opacity="0.12" />
    </>,
  ];

  return (
    <svg
      viewBox="0 0 64 64"
      className="h-16 w-16 text-stem/50"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    >
      {paths[variant]}
    </svg>
  );
}

export default function CatalogPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = trpc.species.list.useInfiniteQuery(
    { search: debouncedSearch || undefined, category: selectedCategory, limit: 20 },
    { getNextPageParam: (lastPage) => lastPage.nextCursor }
  );

  const createPlant = trpc.plants.create.useMutation({
    onSuccess: () => router.push("/plants"),
  });

  const handleAddToGarden = useCallback(
    (speciesId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      createPlant.mutate({ speciesId });
    },
    [createPlant]
  );

  // Infinite scroll observer
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allSpecies = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto max-w-md px-4 pt-12 pb-8 lg:max-w-5xl lg:px-8 xl:max-w-6xl 2xl:max-w-7xl">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight">Каталог растений</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Найдите растение и добавьте его в свой сад
        </p>
      </div>

      {/* Search */}
      <div className="animate-fade-up mt-5" style={{ animationDelay: "60ms" }}>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className={cn(
              "w-full rounded-2xl border border-border/60 bg-surface py-2.5 pl-10 pr-4",
              "text-sm placeholder:text-muted-foreground/60",
              "focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10",
              "transition-all duration-200"
            )}
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="animate-fade-up mt-4 -mx-4 px-4 overflow-x-auto scrollbar-none" style={{ animationDelay: "90ms" }}>
        <div className="flex gap-2 pb-1">
          <button
            onClick={() => setSelectedCategory(undefined)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
              !selectedCategory
                ? "bg-leaf text-white"
                : "bg-surface border border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            Все
          </button>
          {Object.entries(PLANT_CATEGORIES).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(selectedCategory === key ? undefined : key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                selectedCategory === key
                  ? "bg-leaf text-white"
                  : "bg-surface border border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl bg-muted lg:h-72"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      )}

      {/* Species grid */}
      {!isLoading && (
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
          {allSpecies.map((species) => (
            <Link
              key={species.id}
              href={`/catalog/${species.id}`}
              className="card-lift group relative flex flex-col overflow-hidden rounded-2xl bg-surface border border-border/40"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              {/* Image area */}
              <div className="relative flex h-28 items-center justify-center bg-gradient-to-b from-greenhouse/80 to-morning lg:h-48">
                {species.thumbnailUrl || species.catalogPhotos?.[0]?.url ? (
                  <img
                    src={species.thumbnailUrl ?? species.catalogPhotos[0].url}
                    alt={species.commonNameRu}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PlantSvg seed={species.id} />
                )}

                {/* Toxic badge */}
                {(species.toxicToPets || species.toxicToHumans) && (
                  <div className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-50 z-10" title={species.toxicToHumans ? "Токсичен для людей и животных" : "Токсичен для животных"}>
                    <AlertTriangle size={10} className="text-red-500" />
                  </div>
                )}

                {/* Category badge */}
                {species.category && PLANT_CATEGORIES[species.category] && (
                  <div className="absolute bottom-1.5 left-1.5 rounded-md bg-black/40 px-1.5 py-0.5 text-[8px] font-bold text-white/90 backdrop-blur-sm lg:text-[10px]">
                    {PLANT_CATEGORIES[species.category]}
                  </div>
                )}

                {/* Wishlist heart */}
                <WishlistButton speciesId={species.id} className={`absolute top-2 ${(species.toxicToPets || species.toxicToHumans) ? "left-9" : "left-2"}`} />

                {/* Quick add button */}
                <button
                  onClick={(e) => handleAddToGarden(species.id, e)}
                  disabled={createPlant.isPending}
                  className={cn(
                    "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full",
                    "bg-leaf text-white opacity-0 transition-all duration-200",
                    "group-hover:opacity-100 active:scale-90",
                    "focus:opacity-100"
                  )}
                  style={{ boxShadow: "0 2px 6px rgba(27,94,32,0.3)" }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col p-3 lg:p-4">
                <h3 className="truncate text-[13px] font-bold leading-tight lg:text-base">
                  {species.commonNameRu}
                </h3>
                <p className="mt-0.5 truncate text-[10px] italic text-muted-foreground lg:text-xs">
                  {species.scientificName}
                </p>

                {/* Care dots */}
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Sun size={10} className="text-amber-500" />
                    <NeedDots level={species.lightNeed} color="#FF8F00" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplets size={10} className="text-blue-500" />
                    <NeedDots level={species.waterNeed} color="#1565C0" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind size={10} className="text-cyan-500" />
                    <NeedDots level={species.humidityNeed} color="#00838F" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="mt-4 flex justify-center py-4">
        {isFetchingNextPage && (
          <Loader2 size={20} className="animate-spin text-leaf/40" />
        )}
      </div>

      {/* Empty state */}
      {!isLoading && allSpecies.length === 0 && (
        <div className="animate-scale-in mt-16 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-greenhouse to-dew">
            <BookOpen size={32} className="text-stem" />
          </div>
          <p className="mt-5 text-base font-bold tracking-tight">Ничего не найдено</p>
          <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
            Попробуйте другое название или измените запрос
          </p>
        </div>
      )}
    </div>
  );
}

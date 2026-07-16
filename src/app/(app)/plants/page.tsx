"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, SlidersHorizontal, Plus, Leaf, X, Check, Loader2, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlantCard } from "@/components/plants/PlantCard";
import { trpc } from "@/trpc/client";
import { PLANT_CATEGORIES, CARE_TYPE_CONFIG, PLANT_CARE_TYPES } from "@/lib/care-types";
import Link from "next/link";

export default function PlantsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const { data: plants, isLoading } = trpc.plants.list.useQuery();

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loggedType, setLoggedType] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const batchCreate = trpc.logs.batchCreate.useMutation({
    onSuccess: () => {
      utils.recommendations.forDashboard.invalidate();
      utils.plants.list.invalidate();
      setLoggedType(null);
      setSelectionMode(false);
      setSelectedIds(new Set());
    },
  });
  const batchArchive = trpc.plants.batchArchive.useMutation({
    onSuccess: () => {
      utils.plants.list.invalidate();
      setSelectionMode(false);
      setSelectedIds(new Set());
    },
  });
  const duplicateMutation = trpc.plants.duplicate.useMutation({
    onSuccess: () => {
      utils.plants.list.invalidate();
    },
  });

  const filteredPlants = useMemo(() => {
    return (plants ?? []).filter((plant) => {
      if (search) {
        const q = search.toLowerCase();
        const name = (plant.nickname ?? plant.customName ?? "").toLowerCase();
        const species = (plant.species?.commonNameRu ?? "").toLowerCase();
        const scientific = (plant.species?.scientificName ?? "").toLowerCase();
        if (!name.includes(q) && !species.includes(q) && !scientific.includes(q)) return false;
      }
      if (selectedCategory && plant.species?.category !== selectedCategory) return false;
      return true;
    });
  }, [plants, search, selectedCategory]);

  // Group plants by category
  const groupedPlants = useMemo(() => {
    if (search || selectedCategory) {
      return [{ category: null, label: null, plants: filteredPlants }];
    }

    const groups = new Map<string | null, typeof filteredPlants>();
    for (const plant of filteredPlants) {
      const cat = plant.species?.category ?? null;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(plant);
    }

    const categoryOrder = Object.keys(PLANT_CATEGORIES);
    const result: { category: string | null; label: string | null; plants: typeof filteredPlants }[] = [];

    for (const cat of categoryOrder) {
      const items = groups.get(cat);
      if (items && items.length > 0) {
        result.push({ category: cat, label: PLANT_CATEGORIES[cat], plants: items });
      }
    }

    const uncategorized = groups.get(null);
    if (uncategorized && uncategorized.length > 0) {
      result.push({ category: null, label: "Другие", plants: uncategorized });
    }

    return result;
  }, [filteredPlants, search, selectedCategory]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const plant of plants ?? []) {
      if (plant.species?.category) cats.add(plant.species.category);
    }
    return Object.keys(PLANT_CATEGORIES).filter((c) => cats.has(c));
  }, [plants]);

  // Selection helpers
  const enterSelectionMode = useCallback((plantId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([plantId]));
    setLoggedType(null);
  }, []);

  const toggleSelection = useCallback((plantId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(plantId)) next.delete(plantId);
      else next.add(plantId);
      return next;
    });
  }, []);

  const toggleCategorySelection = useCallback((groupPlants: { id: string }[]) => {
    setSelectedIds((prev) => {
      const ids = groupPlants.map((p) => p.id);
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setLoggedType(null);
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredPlants.map((p) => p.id)));
  }, [filteredPlants]);

  // Compute which care types are relevant for selected plants (same logic as CareTab)
  const batchCareTypes = useMemo(() => {
    const selected = (plants ?? []).filter((p) => selectedIds.has(p.id));
    return PLANT_CARE_TYPES.filter((type) => {
      if (type === "SPRAY") {
        // Only show spray if at least one selected plant has humidityNeed >= 3
        return selected.some((p) => p.species && p.species.humidityNeed >= 3);
      }
      return true;
    });
  }, [plants, selectedIds]);

  const handleBatchCare = useCallback(
    (type: string) => {
      if (selectedIds.size === 0) return;
      setLoggedType(type);
      batchCreate.mutate({
        plantIds: Array.from(selectedIds),
        type: type as "WATER" | "SPRAY" | "FERTILIZE_MINERAL" | "FERTILIZE_ORGANIC" | "REPOT" | "PRUNE",
      });
    },
    [selectedIds, batchCreate]
  );

  return (
    <div className="mx-auto max-w-md px-4 pt-12 lg:max-w-5xl lg:px-8 xl:max-w-6xl 2xl:max-w-7xl">
      {/* Header */}
      <div className="animate-fade-up flex items-center justify-between">
        {selectionMode ? (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={exitSelectionMode}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted"
              >
                <X size={18} />
              </button>
              <span className="text-sm font-semibold">
                Выбрано: {selectedIds.size}
              </span>
            </div>
            <button
              onClick={selectAll}
              className="rounded-xl bg-leaf/10 px-3 py-1.5 text-xs font-bold text-leaf transition-colors hover:bg-leaf/15"
            >
              Выбрать все
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">
              Мои растения
              {plants && (
                <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-leaf/10 text-xs font-bold text-leaf">
                  {plants.length}
                </span>
              )}
            </h1>
            <Link
              href="/plants/add"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl",
                "bg-leaf text-white transition-all",
                "hover:bg-leaf-light active:scale-95"
              )}
              style={{ boxShadow: "var(--shadow-fab)" }}
            >
              <Plus size={18} strokeWidth={2.5} />
            </Link>
          </>
        )}
      </div>

      {/* Search bar */}
      {!selectionMode && (
        <div className="animate-fade-up mt-5" style={{ animationDelay: "60ms" }}>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти растение..."
              className={cn(
                "w-full rounded-2xl border border-border/60 bg-surface py-2.5 pl-10 pr-12",
                "text-sm placeholder:text-muted-foreground/60",
                "focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10",
                "transition-all duration-200"
              )}
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-muted p-1.5 transition-colors hover:bg-dew">
              <SlidersHorizontal size={14} className="text-foreground-secondary" />
            </button>
          </div>
        </div>
      )}

      {/* Category chips */}
      {availableCategories.length > 1 && !selectionMode && (
        <div className="animate-fade-up mt-3 -mx-4 px-4 overflow-x-auto scrollbar-none" style={{ animationDelay: "90ms" }}>
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => setSelectedCategory(undefined)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                !selectedCategory
                  ? "bg-leaf text-white"
                  : "bg-surface border border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              Все
            </button>
            {availableCategories.map((key) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(selectedCategory === key ? undefined : key)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap",
                  selectedCategory === key
                    ? "bg-leaf text-white"
                    : "bg-surface border border-border/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {PLANT_CATEGORIES[key]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="mt-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[var(--radius-card)] bg-muted" />
          ))}
        </div>
      )}

      {/* Plants list grouped by category */}
      {!isLoading && (
        <div className={cn("mt-5 space-y-5", selectionMode ? "pb-40" : "pb-6")}>
          {groupedPlants.map((group) => {
            const groupIds = group.plants.map((p) => p.id);
            const allGroupSelected = groupIds.length > 0 && groupIds.every((id) => selectedIds.has(id));

            return (
              <div key={group.category ?? "__all__"}>
                {/* Category header */}
                {group.label && groupedPlants.length > 1 && (
                  <div
                    className={cn(
                      "mb-2 flex items-center gap-2",
                      selectionMode && "cursor-pointer"
                    )}
                    onClick={selectionMode ? () => toggleCategorySelection(group.plants) : undefined}
                  >
                    {selectionMode && (
                      <div
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
                          allGroupSelected
                            ? "border-leaf bg-leaf text-white"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {allGroupSelected && <Check size={11} strokeWidth={3} />}
                      </div>
                    )}
                    <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      {group.label}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground/60">
                      {group.plants.length}
                    </span>
                    <div className="h-px flex-1 bg-border/40" />
                  </div>
                )}

                {/* Plant cards */}
                <div className="stagger space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:space-y-0">
                  {group.plants.map((plant) => (
                    <PlantCard
                      key={plant.id}
                      id={plant.id}
                      name={plant.nickname ?? plant.customName ?? plant.species?.commonNameRu ?? "Растение"}
                      species={plant.species?.scientificName}
                      imageUrl={plant.photos[0]?.url ?? plant.species?.thumbnailUrl ?? plant.species?.imageUrl}
                      waterNeed={plant.species?.waterNeed}
                      lightNeed={plant.species?.lightNeed}
                      roomName={plant.room?.name}
                      isFavorite={plant.isFavorite}
                      className="animate-fade-up"
                      selectionMode={selectionMode}
                      selected={selectedIds.has(plant.id)}
                      onSelect={toggleSelection}
                      onLongPress={enterSelectionMode}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredPlants.length === 0 && search && (
            <div className="animate-fade-in flex flex-col items-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Search size={32} className="text-muted-foreground/40" />
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground">Растения не найдены</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Попробуйте изменить запрос</p>
            </div>
          )}

          {filteredPlants.length === 0 && !search && (
            <div className="animate-fade-in flex flex-col items-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-leaf/10">
                <Leaf size={32} className="text-leaf" />
              </div>
              <p className="mt-4 text-sm font-semibold">Пока нет растений</p>
              <p className="mt-1 text-xs text-muted-foreground">Сканируйте или добавьте из каталога</p>
              <div className="mt-4 flex gap-2">
                <Link href="/scanner" className="rounded-xl bg-leaf px-4 py-2 text-xs font-bold text-white hover:bg-leaf-light">
                  Сканировать
                </Link>
                <Link href="/catalog" className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold hover:bg-muted">
                  Каталог
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch care action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 lg:bottom-6 lg:left-64">
          <div className="mx-auto max-w-md lg:max-w-2xl">
            <div
              className="rounded-2xl bg-surface border border-border/50 p-3 animate-slide-up"
              style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.1)" }}
            >
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Записать уход ({selectedIds.size} раст.)
              </p>
              <div className="flex flex-wrap gap-2">
                {batchCareTypes.map((type) => {
                  const config = CARE_TYPE_CONFIG[type];
                  if (!config) return null;
                  const Icon = config.icon;
                  const isActive = loggedType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => handleBatchCare(type)}
                      disabled={batchCreate.isPending}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95",
                        isActive
                          ? "bg-leaf text-white"
                          : "border border-border/50 bg-surface hover:bg-muted"
                      )}
                    >
                      {batchCreate.isPending && loggedType === type ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : isActive ? (
                        <Check size={13} strokeWidth={2.5} />
                      ) : (
                        <Icon size={13} style={{ color: config.color }} />
                      )}
                      {config.label}
                    </button>
                  );
                })}
              </div>
              {/* Duplicate / Delete actions */}
              <div className="mt-2 pt-2 border-t border-border/30 flex gap-2">
                {selectedIds.size === 1 && (
                  <button
                    onClick={() => {
                      const id = Array.from(selectedIds)[0];
                      duplicateMutation.mutate({ id });
                    }}
                    disabled={duplicateMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-surface px-3 py-2 text-xs font-semibold transition-all active:scale-95 hover:bg-muted"
                  >
                    {duplicateMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} className="text-leaf" />}
                    Дублировать
                  </button>
                )}
                <button
                  onClick={() => batchArchive.mutate({ ids: Array.from(selectedIds) })}
                  disabled={batchArchive.isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-all active:scale-95 hover:bg-red-100"
                >
                  {batchArchive.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Leaf,
  Trash2,
  Pencil,
  ChevronRight,
  Sprout,
  X,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

type Sort = "date" | "priority" | "name";
type PriorityFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

const PRIORITY_CONFIG = {
  HIGH: { label: "Высокий", bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" },
  MEDIUM: { label: "Средний", bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  LOW: { label: "Низкий", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
};

export default function WishlistPage() {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("date");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editPriority, setEditPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [editPrice, setEditPrice] = useState("");

  const utils = trpc.useUtils();

  const { data: items, isLoading } = trpc.wishlist.list.useQuery({
    sort,
    priority: priorityFilter === "ALL" ? undefined : priorityFilter,
  });

  const removeMut = trpc.wishlist.remove.useMutation({
    onSuccess: () => {
      utils.wishlist.list.invalidate();
      utils.wishlist.count.invalidate();
    },
  });

  const updateMut = trpc.wishlist.update.useMutation({
    onSuccess: () => {
      utils.wishlist.list.invalidate();
      setEditingId(null);
    },
  });

  const moveToGardenMut = trpc.wishlist.moveToGarden.useMutation({
    onSuccess: (plant) => {
      utils.wishlist.list.invalidate();
      utils.wishlist.count.invalidate();
      utils.plants.list.invalidate();
      router.push(`/plants/${plant.id}`);
    },
  });

  const openEdit = (item: NonNullable<typeof items>[number]) => {
    setEditingId(item.id);
    setEditNote(item.note ?? "");
    setEditPriority(item.priority);
    setEditPrice(item.price != null ? String(item.price) : "");
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateMut.mutate({
      id: editingId,
      note: editNote || null,
      priority: editPriority,
      price: editPrice ? parseFloat(editPrice) : null,
    });
  };

  const SORTS: { id: Sort; label: string }[] = [
    { id: "date", label: "Дата" },
    { id: "priority", label: "Приоритет" },
    { id: "name", label: "Название" },
  ];

  const FILTERS: { id: PriorityFilter; label: string }[] = [
    { id: "ALL", label: "Все" },
    { id: "HIGH", label: "Важные" },
    { id: "MEDIUM", label: "Средние" },
    { id: "LOW", label: "Потом" },
  ];

  return (
    <div className="mx-auto max-w-md px-4 pt-12 pb-24 lg:max-w-3xl xl:max-w-4xl">
      {/* Header */}
      <div className="animate-fade-up flex items-center gap-3">
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Список желаний</h1>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50">
          <Heart size={16} className="text-rose-500" fill="currentColor" />
        </div>
      </div>

      {/* Sort */}
      <div className="animate-fade-up mt-4 flex gap-2" style={{ animationDelay: "40ms" }}>
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={cn(
              "flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all",
              sort === s.id
                ? "bg-leaf/10 text-leaf border border-leaf/20"
                : "bg-surface border border-border/40 text-muted-foreground"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Priority filter */}
      <div className="animate-fade-up mt-2 flex gap-1.5" style={{ animationDelay: "60ms" }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setPriorityFilter(f.id)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all",
              priorityFilter === f.id
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="mt-4 space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}

        {!isLoading && items?.length === 0 && (
          <div className="animate-scale-in flex flex-col items-center py-16 text-center lg:col-span-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-50">
              <Heart size={32} className="text-rose-300" />
            </div>
            <p className="mt-5 text-base font-bold">Список пуст</p>
            <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
              Добавляйте растения из каталога или сканера
            </p>
            <Link
              href="/catalog"
              className="mt-4 flex items-center gap-2 rounded-2xl bg-leaf px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
            >
              <Leaf size={16} />
              Каталог растений
            </Link>
          </div>
        )}

        {items?.map((item, i) => {
          const pc = PRIORITY_CONFIG[item.priority];
          const name = item.species?.commonNameRu ?? item.customName ?? "Растение";
          const image = item.species?.thumbnailUrl ?? item.species?.imageUrl;
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className="rounded-2xl bg-surface border border-border/40 p-3.5 transition-all"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center gap-3">
                  {/* Image */}
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-greenhouse">
                    {image ? (
                      <img src={image} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Leaf size={18} className="text-stem/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold">{name}</p>
                      <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold", pc.bg, pc.text)}>
                        {pc.label}
                      </span>
                    </div>
                    {item.species?.scientificName && (
                      <p className="mt-0.5 truncate text-xs italic text-muted-foreground">
                        {item.species.scientificName}
                      </p>
                    )}
                    {item.note && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {item.note}
                      </p>
                    )}
                    {item.price != null && (
                      <p className="mt-0.5 text-[10px] font-semibold text-leaf">
                        {item.price.toLocaleString("ru-RU")} ₽
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors hover:bg-leaf/10 hover:text-leaf"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => moveToGardenMut.mutate({ id: item.id })}
                      disabled={moveToGardenMut.isPending}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf/10 text-leaf transition-colors hover:bg-leaf/20"
                    >
                      {moveToGardenMut.isPending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Sprout size={13} />
                      )}
                    </button>
                    <button
                      onClick={() => removeMut.mutate({ id: item.id })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Edit panel */}
                {isEditing && (
                  <div className="mt-3 border-t border-border/30 pt-3 space-y-2.5">
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Заметка..."
                      maxLength={500}
                      rows={2}
                      className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs outline-none focus:border-leaf/40 resize-none"
                    />
                    <div className="flex gap-2">
                      {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => {
                        const cfg = PRIORITY_CONFIG[p];
                        return (
                          <button
                            key={p}
                            onClick={() => setEditPriority(p)}
                            className={cn(
                              "flex-1 rounded-lg py-1.5 text-[10px] font-semibold border transition-all",
                              editPriority === p
                                ? cn(cfg.bg, cfg.text, cfg.border)
                                : "border-border/40 text-muted-foreground"
                            )}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        placeholder="Цена ₽"
                        className="flex-1 rounded-xl border border-border/50 bg-muted/30 px-3 py-1.5 text-xs outline-none focus:border-leaf/40"
                      />
                      <button
                        onClick={saveEdit}
                        disabled={updateMut.isPending}
                        className="rounded-xl bg-leaf px-4 py-1.5 text-xs font-semibold text-white transition-all active:scale-95"
                      >
                        {updateMut.isPending ? <Loader2 size={12} className="animate-spin" /> : "Сохранить"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total value */}
      {items && items.some((i) => i.price != null) && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-surface border border-border/40 px-4 py-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <span className="text-xs text-muted-foreground">Общая стоимость</span>
          <span className="text-sm font-bold text-leaf">
            {items.reduce((sum, i) => sum + (i.price ?? 0), 0).toLocaleString("ru-RU")} ₽
          </span>
        </div>
      )}
    </div>
  );
}

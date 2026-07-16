"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Plus,
  Leaf,
  Loader2,
  Check,
  Home,
  ScanLine,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { WishlistButton } from "@/components/WishlistButton";

export default function AddPlantPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [step, setStep] = useState<"species" | "details">("species");

  const { data: speciesData, isLoading: speciesLoading } = trpc.species.list.useQuery({
    search: search || undefined,
    limit: 20,
  });

  const { data: rooms } = trpc.rooms.list.useQuery();

  const createMutation = trpc.plants.create.useMutation({
    onSuccess: (plant) => router.push(`/plants/${plant.id}`),
  });

  const species = speciesData?.items ?? [];
  const selectedSpecies = species.find((s) => s.id === selectedSpeciesId);

  const handleCreate = () => {
    createMutation.mutate({
      speciesId: selectedSpeciesId ?? undefined,
      nickname: nickname || undefined,
      roomId: selectedRoomId ?? undefined,
    });
  };

  return (
    <div className="mx-auto max-w-md px-4 pt-12 pb-8 lg:max-w-lg">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between">
        <Link
          href="/plants"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-base font-semibold">Добавить растение</h2>
        <div className="w-9" />
      </div>

      {step === "species" && (
        <div className="animate-fade-up mt-5 space-y-4">
          {/* Scanner shortcut */}
          <Link
            href="/scanner"
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-leaf to-leaf-light p-4 text-white transition-all active:scale-[0.98]"
            style={{ boxShadow: "0 4px 16px rgba(27,94,32,0.2)" }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <ScanLine size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Сканировать растение</p>
              <p className="mt-0.5 text-[11px] text-white/70">Определить вид по фото</p>
            </div>
          </Link>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по каталогу..."
              className="w-full rounded-xl border border-border/60 bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
            />
          </div>

          {/* Species list */}
          {speciesLoading && (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          )}

          {species.length > 0 && (
            <div className="space-y-2">
              {speciesData?.fuzzy && (
                <p className="text-xs text-amber-600 font-medium px-1">
                  Точных совпадений нет — похожие результаты:
                </p>
              )}
              {species.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => {
                    setSelectedSpeciesId(sp.id);
                    setStep("details");
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface border border-border/30 p-3 text-left transition-all hover:bg-greenhouse/30 active:scale-[0.98]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-leaf/8">
                    <Leaf size={18} className="text-stem" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{sp.commonNameRu ?? sp.scientificName}</p>
                      {(sp.toxicToPets || sp.toxicToHumans) && (
                        <ShieldAlert size={12} className="shrink-0 text-red-500" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] italic text-muted-foreground truncate">{sp.scientificName}</p>
                  </div>
                  <Plus size={16} className="shrink-0 text-leaf" />
                </button>
              ))}
            </div>
          )}

          {species.length === 0 && !speciesLoading && search && (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-sm font-semibold">Ничего не найдено</p>
              <p className="mt-1 text-xs text-muted-foreground">Попробуйте другое написание или латинское название</p>
              <button
                onClick={() => {
                  setSelectedSpeciesId(null);
                  setStep("details");
                }}
                className="mt-4 flex items-center gap-1.5 rounded-xl bg-leaf px-4 py-2.5 text-xs font-semibold text-white"
              >
                <Plus size={14} />
                Добавить без вида
              </button>
            </div>
          )}
        </div>
      )}

      {step === "details" && (
        <div className="animate-fade-up mt-5 space-y-4">
          {/* Selected species */}
          {selectedSpecies && (
            <div
              className="flex items-center gap-3 rounded-2xl bg-leaf/5 border border-leaf/20 p-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf/10">
                <Leaf size={16} className="text-leaf" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{selectedSpecies.commonNameRu ?? selectedSpecies.scientificName}</p>
                <p className="text-[11px] italic text-muted-foreground">{selectedSpecies.scientificName}</p>
              </div>
              <button
                onClick={() => { setSelectedSpeciesId(null); setStep("species"); }}
                className="text-xs font-semibold text-leaf"
              >
                Изменить
              </button>
            </div>
          )}

          {/* Toxicity warning */}
          {selectedSpecies && (selectedSpecies.toxicToPets || selectedSpecies.toxicToHumans) && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="text-xs font-bold text-red-700">Токсичное растение</p>
                  <p className="mt-0.5 text-[11px] text-red-600">
                    {selectedSpecies.toxicToPets && selectedSpecies.toxicToHumans
                      ? "Опасно для животных и людей."
                      : selectedSpecies.toxicToPets
                        ? "Опасно для кошек, собак и других животных."
                        : "Опасно для людей при попадании внутрь."}
                    {" "}Держите растение в недоступном месте.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Nickname */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Имя растения (необязательно)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Зелёнка, Малыш..."
              className="w-full rounded-xl border border-border/60 bg-surface py-2.5 px-3 text-sm focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
            />
          </div>

          {/* Room selection */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Комната (необязательно)
            </label>
            <div className="flex flex-wrap gap-2">
              {(rooms ?? []).map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(selectedRoomId === room.id ? null : room.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95",
                    selectedRoomId === room.id
                      ? "bg-leaf text-white"
                      : "bg-surface border border-border/50 text-foreground hover:bg-muted"
                  )}
                >
                  <Home size={12} />
                  {room.name}
                </button>
              ))}
              {(rooms ?? []).length === 0 && (
                <Link
                  href="/rooms"
                  className="flex items-center gap-1.5 rounded-xl border border-dashed border-leaf/30 px-3 py-2 text-xs font-semibold text-leaf transition-colors hover:bg-leaf/5"
                >
                  <Plus size={12} />
                  Создать комнату
                </Link>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-leaf py-3 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
            >
              {createMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Добавить в сад
            </button>
            {selectedSpeciesId && (
              <WishlistButton speciesId={selectedSpeciesId} variant="full" />
            )}
            <button
              onClick={() => setStep("species")}
              className="w-full rounded-xl border border-border/50 py-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              Назад
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

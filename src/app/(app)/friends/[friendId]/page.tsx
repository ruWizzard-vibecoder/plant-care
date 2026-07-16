"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Leaf,
  Trophy,
  Lock,
  GitCompareArrows,
  Heart,
  Gift,
} from "lucide-react";
import { PlantCard } from "@/components/plants/PlantCard";
import { trpc } from "@/trpc/client";
import { ALL_ACHIEVEMENTS } from "@/server/lib/achievements";
import { GrowthComparisonModal } from "@/components/GrowthComparisonModal";

export default function FriendGardenPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const [compareWith, setCompareWith] = useState<{ myPlantId: string; friendPlantId: string } | null>(null);

  const { data: garden, isLoading: gardenLoading } = trpc.friends.friendGarden.useQuery(
    { friendId },
    { enabled: !!friendId }
  );
  const { data: friendAch } = trpc.friends.friendAchievements.useQuery(
    { friendId },
    { enabled: !!friendId }
  );
  const { data: myPlants } = trpc.plants.list.useQuery();
  const { data: friendWishlist } = trpc.wishlist.friendWishlist.useQuery(
    { friendId },
    { enabled: !!friendId }
  );
  const utils = trpc.useUtils();
  const toggleReservation = trpc.wishlist.toggleReservation.useMutation({
    onSuccess: () => utils.wishlist.friendWishlist.invalidate({ friendId }),
  });

  if (gardenLoading) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12 lg:max-w-3xl">
        <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      </div>
    );
  }

  if (!garden) return null;

  const friend = garden.friend;

  // Find matching species for comparison
  const mySpeciesMap = new Map<string, string>();
  for (const p of myPlants ?? []) {
    if (p.speciesId) mySpeciesMap.set(p.speciesId, p.id);
  }

  return (
    <div className="mx-auto max-w-md lg:max-w-3xl">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between px-4 pt-12">
        <Link
          href="/friends"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-base font-semibold truncate max-w-48">{friend.name}</h2>
        <div className="w-9" />
      </div>

      {/* Friend header card */}
      <div className="animate-fade-up mx-4 mt-4 rounded-2xl bg-gradient-to-br from-greenhouse to-dew border border-leaf/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface/80">
            {friend.image ? (
              <img src={friend.image} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-stem">{friend.name[0]}</span>
            )}
          </div>
          <div>
            <p className="text-base font-bold">{friend.name}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-foreground/70">
              <span className="flex items-center gap-1">
                <Leaf size={12} className="text-leaf" />
                {garden.plants.length} растений
              </span>
              {friendAch && !friendAch.hidden && (
                <span className="flex items-center gap-1">
                  <Trophy size={12} className="text-amber-500" />
                  {friendAch.achievements.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden collection */}
      {garden.hidden && (
        <div className="mx-4 mt-6 flex flex-col items-center py-12">
          <Lock size={32} className="text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">Коллекция скрыта</p>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            Этот пользователь не показывает<br />свою коллекцию друзьям
          </p>
        </div>
      )}

      {/* Plants */}
      {!garden.hidden && (
        <div className="px-4 mt-5">
          <h3 className="text-sm font-bold">Растения</h3>

          {garden.plants.length === 0 ? (
            <div className="mt-4 flex flex-col items-center py-8">
              <Leaf size={24} className="text-muted-foreground" />
              <p className="mt-2 text-xs text-muted-foreground">Пока нет растений</p>
            </div>
          ) : (
            <div className="stagger mt-3 space-y-2.5">
              {garden.plants.map((plant, i) => {
                const name = plant.nickname ?? plant.customName ?? plant.species?.commonNameRu ?? "Растение";
                const canCompare = plant.speciesId && mySpeciesMap.has(plant.speciesId);

                return (
                  <div
                    key={plant.id}
                    className="animate-fade-up relative"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <PlantCard
                      id={plant.id}
                      name={name}
                      species={plant.species?.scientificName}
                      imageUrl={plant.photos[0]?.url ?? plant.species?.thumbnailUrl ?? plant.species?.imageUrl}
                      waterNeed={plant.species?.waterNeed}
                      lightNeed={plant.species?.lightNeed}
                      roomName={plant.room?.name}
                    />
                    {canCompare && (
                      <button
                        onClick={() =>
                          setCompareWith({
                            myPlantId: mySpeciesMap.get(plant.speciesId!)!,
                            friendPlantId: plant.id,
                          })
                        }
                        className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-indigo-500/90 px-2.5 py-1 text-white shadow-md transition-all hover:bg-indigo-600 active:scale-95"
                      >
                        <GitCompareArrows size={12} />
                        <span className="text-[10px] font-bold">Сравнить</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Achievements */}
      {friendAch && !friendAch.hidden && friendAch.achievements.length > 0 && (
        <div className="px-4 mt-6 pb-6">
          <h3 className="text-sm font-bold">Достижения</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {friendAch.achievements.map((ach) => {
              const def = ALL_ACHIEVEMENTS.find((a) => a.type === ach.type);
              if (!def) return null;
              return (
                <div
                  key={ach.type}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200/40 px-2.5 py-1.5"
                >
                  <span className="text-base">{def.icon}</span>
                  <span className="text-[10px] font-semibold text-amber-700">{def.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wishlist */}
      {friendWishlist && !friendWishlist.hidden && friendWishlist.items.length > 0 && (
        <div className="px-4 mt-6">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Heart size={14} className="text-rose-500" fill="currentColor" />
            Список желаний
          </h3>
          <div className="mt-3 space-y-2">
            {friendWishlist.items.map((item) => {
              const name = item.species?.commonNameRu ?? item.customName ?? "Растение";
              const image = item.species?.thumbnailUrl ?? item.species?.imageUrl;
              const isReservedByMe = item.reservedBy?.id === friendWishlist.currentUserId;
              const isReservedByOther = item.reservedBy && !isReservedByMe;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl bg-surface border border-border/40 p-3"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-greenhouse">
                    {image ? (
                      <img src={image} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Leaf size={14} className="text-stem/40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{name}</p>
                    {item.species?.scientificName && (
                      <p className="truncate text-[10px] italic text-muted-foreground">
                        {item.species.scientificName}
                      </p>
                    )}
                    {isReservedByOther && (
                      <p className="text-[10px] font-medium text-purple-500">
                        Зарезервировано {item.reservedBy!.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleReservation.mutate({ itemId: item.id, friendId })}
                    disabled={toggleReservation.isPending || (!!isReservedByOther)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      item.reservedBy
                        ? "bg-purple-50 text-purple-500"
                        : "bg-muted/60 text-muted-foreground hover:bg-purple-50 hover:text-purple-500"
                    }`}
                    title={item.reservedBy ? "Снять резерв" : "Зарезервировать как подарок"}
                  >
                    <Gift size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {friendWishlist && friendWishlist.hidden && (
        <div className="mx-4 mt-6 flex flex-col items-center py-6">
          <Lock size={20} className="text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">Список желаний скрыт</p>
        </div>
      )}

      {/* Growth comparison modal */}
      {compareWith && (
        <GrowthComparisonModal
          myPlantId={compareWith.myPlantId}
          friendPlantId={compareWith.friendPlantId}
          onClose={() => setCompareWith(null)}
        />
      )}

      <div className="h-24" />
    </div>
  );
}
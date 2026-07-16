"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sun,
  Droplets,
  Thermometer,
  Wind,
  Sprout,
  Shovel,
  Copy,
  ShieldAlert,
  MessageCircle,
  Trash2,
  Leaf,
  TrendingUp,
  Plus,
  Ruler,
  Loader2,
  Pencil,
  Check,
  StickyNote,
  ChevronRight,
  Tag,
  Camera,
  ImagePlus,
  X,
  Home,
  Stethoscope,
  GitBranch,
  ChevronDown,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { AiChatModal } from "@/components/AiChatModal";
import { DiagnosisModal } from "@/components/DiagnosisModal";
import { CareCalendarModal } from "@/components/CareCalendarModal";
import { GrowthChart } from "@/components/GrowthChart";
import { CARE_TYPE_CONFIG, PLANT_CARE_TYPES, PLANT_CATEGORIES } from "@/lib/care-types";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const TABS = ["Информация", "Уход", "Рост"] as const;
type Tab = (typeof TABS)[number];

function needLabel(level: number) {
  if (level >= 5) return "Очень высокий";
  if (level >= 4) return "Высокий";
  if (level >= 3) return "Средний";
  if (level >= 2) return "Низкий";
  return "Минимальный";
}

export default function PlantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Информация");
  const [chatOpen, setChatOpen] = useState(false);
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [calendarModal, setCalendarModal] = useState<{ type: string; label: string } | null>(null);

  const heroInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState("");

  const utils = trpc.useUtils();
  const { data: plant, isLoading } = trpc.plants.getById.useQuery({ id: params.id });
  const { data: rooms } = trpc.rooms.list.useQuery();
  const archiveMutation = trpc.plants.archive.useMutation({
    onSuccess: () => router.push("/plants"),
  });
  const addPhotoMutation = trpc.plants.addPhoto.useMutation({
    onSuccess: () => utils.plants.getById.invalidate({ id: params.id }),
  });
  const deletePhotoMutation = trpc.plants.deletePhoto.useMutation({
    onSuccess: () => utils.plants.getById.invalidate({ id: params.id }),
  });
  const setCoverMutation = trpc.plants.setCoverPhoto.useMutation({
    onSuccess: () => utils.plants.getById.invalidate({ id: params.id }),
  });
  const updateMutation = trpc.plants.update.useMutation({
    onSuccess: () => {
      utils.plants.getById.invalidate({ id: params.id });
      setEditingNotes(false);
      setEditingNickname(false);
    },
  });
  const duplicateMutation = trpc.plants.duplicate.useMutation({
    onSuccess: (newPlant) => router.push(`/plants/${newPlant.id}`),
  });
  const favoriteMutation = trpc.plants.toggleFavorite.useMutation({
    onMutate: async () => {
      await utils.plants.getById.cancel({ id: params.id });
      const prev = utils.plants.getById.getData({ id: params.id });
      if (prev) {
        utils.plants.getById.setData({ id: params.id }, { ...prev, isFavorite: !prev.isFavorite });
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        utils.plants.getById.setData({ id: params.id }, context.prev);
      }
    },
    onSettled: () => {
      utils.plants.getById.invalidate({ id: params.id });
      utils.plants.list.invalidate();
    },
  });

  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url;
  }

  // Hero: upload single file → replace cover
  async function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !plant) return;
    setUploadingHero(true);
    try {
      const url = await uploadFile(file);
      if (!url) throw new Error("Upload failed");
      const photo = await addPhotoMutation.mutateAsync({ plantId: plant.id, url });
      await setCoverMutation.mutateAsync({ photoId: photo.id, plantId: plant.id });
    } catch {
      /* handled by mutation error state */
    } finally {
      setUploadingHero(false);
      if (heroInputRef.current) heroInputRef.current.value = "";
    }
  }

  // Gallery: upload multiple files
  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !plant) return;
    setUploadingGallery(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadFile(file);
        if (url) {
          await addPhotoMutation.mutateAsync({ plantId: plant.id, url });
        }
      }
    } catch {
      /* handled by mutation error state */
    } finally {
      setUploadingGallery(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  // Delete hero cover photo
  function handleDeleteHero() {
    const coverPhoto = plant?.photos.find((p) => p.isCover) ?? plant?.photos[0];
    if (coverPhoto) {
      deletePhotoMutation.mutate({ photoId: coverPhoto.id, plantId: plant!.id });
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 pt-12 lg:max-w-5xl lg:px-8">
        <div className="h-8 w-32 animate-pulse rounded-xl bg-muted" />
        <div className="mt-4 h-64 animate-pulse rounded-3xl bg-muted" />
        <div className="mt-4 h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!plant) return null;

  const plantName = plant.nickname ?? plant.customName ?? plant.species?.commonNameRu ?? "Растение";
  const species = plant.species;

  const careItems = species
    ? [
        { icon: Sun, label: "Освещение", value: needLabel(species.lightNeed), color: "#FF8F00" },
        { icon: Droplets, label: "Полив", value: needLabel(species.waterNeed), color: "#1E88E5" },
        { icon: Thermometer, label: "Температура", value: species.tempMin && species.tempMax ? `${species.tempMin}–${species.tempMax}°C` : "—", color: "#FF6D00" },
        { icon: Wind, label: "Влажность", value: needLabel(species.humidityNeed), color: "#42A5F5" },
        { icon: Sprout, label: "Рост", value: species.growthRate ?? "—", color: "#4CAF50" },
        { icon: Shovel, label: "Почва", value: species.soilType ?? "Универсальный", color: "#795548" },
      ]
    : [];

  // Rendered twice: under the photo in the left column on desktop, in the original flow on mobile
  const nameSection = (
    <div className="animate-fade-up px-4 mt-4 lg:px-0 lg:mt-5" style={{ animationDelay: "160ms" }}>
      {editingNickname ? (
        <div className="space-y-2">
          <input
            type="text"
            value={nicknameValue}
            onChange={(e) => setNicknameValue(e.target.value)}
            placeholder={species?.commonNameRu ?? "Прозвище растения"}
            autoFocus
            className={cn(
              "w-full rounded-xl border border-border/60 bg-surface px-3 py-2 text-lg font-bold",
              "placeholder:text-muted-foreground/50",
              "focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
            )}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setEditingNickname(false)}
              className="flex-1 rounded-xl border border-border/50 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              Отмена
            </button>
            <button
              onClick={() => updateMutation.mutate({ id: plant.id, nickname: nicknameValue || null })}
              disabled={updateMutation.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-leaf py-1.5 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
            >
              {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Сохранить
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{plantName}</h1>
          <button
            onClick={() => { setNicknameValue(plant.nickname ?? ""); setEditingNickname(true); }}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
          >
            <Pencil size={12} />
          </button>
        </div>
      )}
      {species && !editingNickname && (
        <p className="mt-0.5 text-xs tracking-widest text-muted-foreground uppercase italic">
          {species.scientificName}
        </p>
      )}
      {/* Category + Tags */}
      {species && (
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
          {Array.isArray(species.tags) && (species.tags as string[]).map((tag: string) => (
            <span
              key={tag}
              className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-md lg:max-w-5xl lg:grid lg:grid-cols-[26rem_minmax(0,1fr)] lg:items-start lg:gap-x-10 lg:px-8 xl:max-w-6xl">
      {/* Top nav */}
      <div className="animate-fade-in flex items-center justify-between px-4 pt-12 lg:col-span-2">
        <Link
          href="/plants"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-base font-semibold">Растение</h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => favoriteMutation.mutate({ id: plant.id })}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
              plant.isFavorite
                ? "bg-amber-50 border-amber-200 text-amber-500"
                : "bg-surface border-border/50 text-muted-foreground hover:bg-amber-50 hover:text-amber-500"
            )}
            title="Избранное"
          >
            <Star size={14} fill={plant.isFavorite ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => duplicateMutation.mutate({ id: plant.id })}
            disabled={duplicateMutation.isPending}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-leaf/10"
            title="Дублировать"
          >
            {duplicateMutation.isPending ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : <Copy size={14} className="text-muted-foreground" />}
          </button>
          <button
            onClick={() => archiveMutation.mutate({ id: plant.id })}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-red-50"
            title="Удалить"
          >
            <Trash2 size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Left column on desktop: photo + name; plain flow on mobile */}
      <div className="contents lg:block lg:col-start-1 lg:row-start-2 lg:sticky lg:top-8">
      {/* Hero image — cover/main photo */}
      {(() => {
        const coverPhoto = plant.photos.find((p) => p.isCover) ?? plant.photos[0];
        const isUserCover = !!coverPhoto;
        const heroUrl = coverPhoto?.url ?? species?.thumbnailUrl ?? species?.imageUrl;
        return (
          <div className="animate-scale-in mx-4 mt-4 lg:mx-0">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-muted to-greenhouse">
              {heroUrl ? (
                <img src={heroUrl} alt={plantName} className="h-64 w-full object-cover lg:h-96" />
              ) : (
                <div className="flex h-64 items-center justify-center lg:h-96">
                  <svg viewBox="0 0 120 160" className="h-40 w-28 text-stem/30" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M60 160V60" strokeLinecap="round" />
                    <path d="M60 60C60 60 30 48 20 24C10 0 30 -4 46 12C62 28 60 60 60 60Z" fill="currentColor" opacity="0.15" />
                    <path d="M60 80C60 80 90 68 100 44C110 20 90 16 74 32C58 48 60 80 60 80Z" fill="currentColor" opacity="0.1" />
                  </svg>
                </div>
              )}
              {/* Hero controls */}
              <div className="absolute bottom-3 right-3 flex gap-2">
                {isUserCover && (
                  <button
                    onClick={handleDeleteHero}
                    disabled={deletePhotoMutation.isPending}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-red-600/70 active:scale-90"
                    title="Удалить"
                  >
                    <X size={16} />
                  </button>
                )}
                <button
                  onClick={() => heroInputRef.current?.click()}
                  disabled={uploadingHero}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70 active:scale-90 disabled:opacity-50"
                  title="Заменить"
                >
                  {uploadingHero ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                </button>
              </div>
              {/* Top row: label + diagnose */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <div className="rounded-full bg-black/40 px-2.5 py-0.5 backdrop-blur-sm">
                  <span className="text-[10px] font-bold text-white">
                    {isUserCover ? "Заглавное фото" : "Фото из каталога"}
                  </span>
                </div>
                <button
                  onClick={() => setDiagnosisOpen(true)}
                  className="flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-1 text-white backdrop-blur-sm transition-all hover:bg-amber-500 active:scale-95"
                >
                  <Stethoscope size={12} />
                  <span className="text-[10px] font-bold">Диагностика</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Desktop-only name under the photo */}
      <div className="hidden lg:block">{nameSection}</div>
      </div>

      {/* Right column on desktop: tabs + tab content (display:contents keeps mobile flow) */}
      <div className="contents lg:block lg:col-start-2 lg:row-start-2 lg:min-w-0">
      {/* Hero file input — single */}
      <input
        ref={heroInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleHeroUpload}
        className="hidden"
      />
      {/* Gallery file input — multiple */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        onChange={handleGalleryUpload}
        className="hidden"
      />

      {/* Tabs */}
      <div className="animate-fade-up mt-4 flex gap-2 px-4" style={{ animationDelay: "100ms" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
              activeTab === tab ? "bg-leaf text-white" : "bg-muted text-muted-foreground hover:bg-dew"
            )}
          >
            {tab}
          </button>
        ))}
        <button
          onClick={() => setChatOpen(true)}
          className="ml-auto flex items-center gap-1 rounded-full bg-surface border border-border/50 px-3 py-2 text-xs font-medium text-leaf transition-colors hover:bg-leaf/10 active:scale-95"
        >
          <MessageCircle size={12} />
          AI чат
        </button>
      </div>

      {/* Plant name (mobile position; on desktop it renders under the photo) */}
      <div className="contents lg:hidden">{nameSection}</div>

      {/* Tab content */}
      <div className="px-4 mt-4 pb-6">
        {activeTab === "Информация" && (
          <div className="animate-fade-up space-y-5">
            {/* Toxicity warning */}
            {species && (species.toxicToPets || species.toxicToHumans) && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-600" />
                  <div>
                    <p className="text-xs font-bold text-red-700">Токсичное растение</p>
                    <p className="mt-0.5 text-[11px] text-red-600">
                      {species.toxicToPets && species.toxicToHumans
                        ? "Опасно для животных и людей."
                        : species.toxicToPets
                          ? "Опасно для кошек, собак и других животных."
                          : "Опасно для людей при попадании внутрь."}
                      {" "}Держите в недоступном месте.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {careItems.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {careItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface border border-border/30 p-3"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}15` }}>
                      <item.icon size={15} style={{ color: item.color }} strokeWidth={2} />
                    </div>
                    <span className="text-[10px] font-bold text-center" style={{ color: item.color }}>{item.value}</span>
                    <span className="text-[9px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Photo Gallery — non-cover photos */}
            {(() => {
              const coverPhotoId = (plant.photos.find((p) => p.isCover) ?? plant.photos[0])?.id;
              const galleryPhotos = plant.photos.filter((p) => p.id !== coverPhotoId);
              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold">
                      Галерея
                      {galleryPhotos.length > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">{galleryPhotos.length}</span>
                      )}
                    </h3>
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={uploadingGallery}
                      className="flex items-center gap-1 rounded-lg bg-leaf/10 px-2.5 py-1 text-[10px] font-bold text-leaf transition-colors hover:bg-leaf/15"
                    >
                      {uploadingGallery ? <Loader2 size={10} className="animate-spin" /> : <ImagePlus size={10} />}
                      Добавить
                    </button>
                  </div>

                  {galleryPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {galleryPhotos.map((photo) => (
                        <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-muted">
                          <img src={photo.url} alt="" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 opacity-0 group-hover:bg-black/40 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => setCoverMutation.mutate({ photoId: photo.id, plantId: plant.id })}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-leaf transition-transform hover:scale-110"
                              title="Сделать заглавным"
                            >
                              <Camera size={12} />
                            </button>
                            <button
                              onClick={() => deletePhotoMutation.mutate({ photoId: photo.id, plantId: plant.id })}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-red-500 transition-transform hover:scale-110"
                              title="Удалить"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {/* Add more button */}
                      <button
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={uploadingGallery}
                        className="flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-leaf/30 bg-leaf/5 text-leaf transition-colors hover:bg-leaf/10"
                      >
                        {uploadingGallery ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={uploadingGallery}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-leaf/30 bg-leaf/5 py-6 text-xs font-semibold text-leaf transition-colors hover:bg-leaf/10"
                    >
                      {uploadingGallery ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                      Добавить фотографии
                    </button>
                  )}
                </div>
              );
            })()}

            {species?.description && (
              <div>
                <h3 className="text-sm font-bold">Описание</h3>
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground-secondary">
                  {species.description.split("\n\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Room selector */}
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5 mb-2">
                <Home size={14} className="text-muted-foreground" />
                Комната
              </h3>
              <div className="flex flex-wrap gap-2">
                {(rooms ?? []).map((room) => (
                  <button
                    key={room.id}
                    onClick={() => updateMutation.mutate({ id: plant.id, roomId: plant.roomId === room.id ? null : room.id })}
                    disabled={updateMutation.isPending}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all active:scale-95",
                      plant.roomId === room.id
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

            {/* Notes section */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <StickyNote size={14} className="text-muted-foreground" />
                  Заметки
                </h3>
                {!editingNotes && (
                  <button
                    onClick={() => { setNotesValue(plant.notes ?? ""); setEditingNotes(true); }}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-leaf transition-colors hover:bg-leaf/10"
                  >
                    <Pencil size={10} />
                    {plant.notes ? "Изменить" : "Добавить"}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Особенности ухода, пересадка, наблюдения..."
                    rows={4}
                    autoFocus
                    className={cn(
                      "w-full rounded-xl border border-border/60 bg-surface p-3 text-sm leading-relaxed",
                      "placeholder:text-muted-foreground/50 resize-none",
                      "focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
                    )}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="flex-1 rounded-xl border border-border/50 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => updateMutation.mutate({ id: plant.id, notes: notesValue })}
                      disabled={updateMutation.isPending}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-leaf py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
                    >
                      {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Сохранить
                    </button>
                  </div>
                </div>
              ) : plant.notes ? (
                <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-foreground-secondary">
                  {plant.notes.split("\n").map((line, i) => (
                    <p key={i}>{line || "\u00A0"}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground/60 italic">Нет заметок</p>
              )}
            </div>

            {/* Propagation section */}
            <PropagationSection plantId={plant.id} />
          </div>
        )}

        {activeTab === "Уход" && (
          <CareTab
            plant={plant}
            onOpenCalendar={(type, label) => setCalendarModal({ type, label })}
          />
        )}

        {activeTab === "Рост" && (
          <GrowthTab plantId={plant.id} records={plant.growthRecords} />
        )}
      </div>
      </div>
      {/* Floating AI button */}
      <button
        onClick={() => setChatOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full lg:bottom-8 lg:right-8",
          "bg-leaf text-white transition-all duration-200 active:scale-90"
        )}
        style={{ boxShadow: "0 4px 16px rgba(27,94,32,0.3)" }}
      >
        <MessageCircle size={20} />
      </button>

      {/* AI Chat Modal */}
      <AiChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        plantId={plant.id}
        plantName={plantName}
      />

      {/* AI Diagnosis Modal */}
      <DiagnosisModal
        open={diagnosisOpen}
        onClose={() => setDiagnosisOpen(false)}
        plantId={plant.id}
        plantName={plantName}
        existingPhotos={plant.photos}
      />

      {/* Care Calendar Modal */}
      {calendarModal && (
        <CareCalendarModal
          open={!!calendarModal}
          onClose={() => setCalendarModal(null)}
          plantId={plant.id}
          type={calendarModal.type}
          typeLabel={calendarModal.label}
        />
      )}
    </div>
  );
}

/* ========== Care Tab — log-based care types ========== */

function CareTab({ plant, onOpenCalendar }: { plant: { id: string; careLogs?: { type: string; doneAt: Date }[]; species: { wateringFreqDays: number; fertilizingFreqDays: number; fertilizingOrganicFreqDays: number; repottingFreqDays: number; humidityNeed: number } | null }; onOpenCalendar: (type: string, label: string) => void }) {
  const [loggedTypes, setLoggedTypes] = useState<Set<string>>(new Set());
  const utils = trpc.useUtils();

  const createLog = trpc.logs.create.useMutation({
    onSuccess: () => {
      utils.plants.getById.invalidate({ id: plant.id });
      utils.recommendations.forDashboard.invalidate();
    },
  });

  const handleLog = (type: string) => {
    setLoggedTypes((prev) => new Set(prev).add(type));
    createLog.mutate({
      plantId: plant.id,
      type: type as "WATER" | "SPRAY" | "FERTILIZE_MINERAL" | "FERTILIZE_ORGANIC" | "REPOT" | "PRUNE",
    });
  };

  // Build a map of type → most recent log date
  const lastLogByType = new Map<string, Date>();
  for (const log of plant.careLogs ?? []) {
    const existing = lastLogByType.get(log.type);
    if (!existing || new Date(log.doneAt) > existing) {
      lastLogByType.set(log.type, new Date(log.doneAt));
    }
  }

  // Get frequency for each type
  const freqMap: Record<string, number | null> = {
    WATER: plant.species?.wateringFreqDays ?? 7,
    SPRAY: plant.species && plant.species.humidityNeed >= 3 ? 7 : null,
    FERTILIZE_MINERAL: plant.species?.fertilizingFreqDays ?? 30,
    FERTILIZE_ORGANIC: plant.species?.fertilizingOrganicFreqDays ?? 90,
    REPOT: plant.species?.repottingFreqDays ?? 365,
    PRUNE: null,
  };

  const now = new Date();

  return (
    <div className="animate-fade-up space-y-2">
      {PLANT_CARE_TYPES.map((type) => {
        const config = CARE_TYPE_CONFIG[type];
        if (!config) return null;
        const freq = freqMap[type];
        // Skip spray if humidity need is low (null freq)
        if (freq === null && type === "SPRAY") return null;
        // Skip prune — show but no frequency
        const TypeIcon = config.icon;
        const lastDone = lastLogByType.get(type);
        const daysSince = lastDone
          ? Math.floor((now.getTime() - lastDone.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const isLogged = loggedTypes.has(type);

        // Determine status color
        let statusColor = "text-muted-foreground";
        let statusBg = "";
        if (freq && daysSince !== null) {
          if (daysSince >= freq * 1.5) {
            statusColor = "text-red-600";
            statusBg = "bg-red-50";
          } else if (daysSince >= freq) {
            statusColor = "text-amber-600";
            statusBg = "bg-amber-50";
          }
        } else if (daysSince === null && freq) {
          statusColor = "text-amber-600";
          statusBg = "bg-amber-50";
        }

        return (
          <div
            key={type}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-300 cursor-pointer",
              isLogged
                ? "bg-leaf/5 border-leaf/20"
                : `bg-surface border-border/30 ${statusBg}`
            )}
            style={!isLogged ? { boxShadow: "var(--shadow-card)" } : undefined}
            onClick={() => onOpenCalendar(type, config.label)}
          >
            {/* Icon */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: config.bgLight }}
            >
              <TypeIcon size={18} style={{ color: config.color }} />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{config.label}</p>
              <p className={cn("text-xs", statusColor)}>
                {daysSince !== null
                  ? `${daysSince} дн. назад`
                  : "Ещё не выполнялся"}
                {freq && <span className="text-muted-foreground"> · каждые {freq} дн.</span>}
              </p>
            </div>

            {/* Action button */}
            {isLogged ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-leaf text-white">
                <Check size={14} strokeWidth={3} />
              </span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); handleLog(type); }}
                disabled={createLog.isPending}
                className="flex h-8 shrink-0 items-center gap-1 rounded-xl bg-leaf px-3 text-[11px] font-bold text-white transition-all active:scale-95 disabled:opacity-40"
              >
                {createLog.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Записать"
                )}
              </button>
            )}

            {/* Chevron */}
            <ChevronRight size={14} className="shrink-0 text-muted-foreground/40" />
          </div>
        );
      })}
    </div>
  );
}

/* ========== Propagation Section ========== */

const PROP_METHODS = [
  { value: "STEM_CUTTING", label: "Стеблевой черенок" },
  { value: "LEAF_CUTTING", label: "Листовой черенок" },
  { value: "DIVISION", label: "Деление куста" },
  { value: "AIR_LAYERING", label: "Воздушная отводка" },
  { value: "WATER_ROOTING", label: "Укоренение в воде" },
  { value: "SEEDS", label: "Семена" },
  { value: "OTHER", label: "Другое" },
] as const;

const PROP_STATUSES = [
  { value: "STARTED", label: "Начато", color: "#9E9E9E" },
  { value: "ROOTING", label: "Укореняется", color: "#FF9800" },
  { value: "ROOTED", label: "Укоренилось", color: "#4CAF50" },
  { value: "PLANTED", label: "Посажено", color: "#1B5E20" },
  { value: "FAILED", label: "Не прижилось", color: "#F44336" },
] as const;

function PropagationSection({ plantId }: { plantId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState<string>("STEM_CUTTING");
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();

  const { data: propagations } = trpc.propagation.listByPlant.useQuery({ plantId });

  const createMutation = trpc.propagation.create.useMutation({
    onSuccess: () => {
      utils.propagation.listByPlant.invalidate({ plantId });
      setShowForm(false);
      setNote("");
    },
  });

  const updateStatusMutation = trpc.propagation.updateStatus.useMutation({
    onSuccess: () => utils.propagation.listByPlant.invalidate({ plantId }),
  });

  const deleteMutation = trpc.propagation.delete.useMutation({
    onSuccess: () => utils.propagation.listByPlant.invalidate({ plantId }),
  });

  const active = (propagations ?? []).filter((p) => p.status !== "PLANTED" && p.status !== "FAILED");
  const completed = (propagations ?? []).filter((p) => p.status === "PLANTED" || p.status === "FAILED");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <GitBranch size={14} className="text-muted-foreground" />
          Размножение
          {active.length > 0 && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">{active.length}</span>
          )}
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-leaf transition-colors hover:bg-leaf/10"
          >
            <Plus size={10} />
            Добавить
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mt-2 rounded-2xl bg-surface border border-border/30 p-4 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-bold">Новое размножение</p>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Метод</label>
            <div className="flex flex-wrap gap-1.5">
              {PROP_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all",
                    method === m.value
                      ? "bg-leaf text-white"
                      : "bg-muted text-muted-foreground hover:bg-dew"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Заметка (необязательно)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Среда для укоренения, условия..."
              maxLength={500}
              className="w-full rounded-xl border border-border/60 bg-surface py-2 px-3 text-sm placeholder:text-muted-foreground/50 focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setNote(""); }}
              className="flex-1 rounded-xl border border-border/50 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              Отмена
            </button>
            <button
              onClick={() => createMutation.mutate({
                parentPlantId: plantId,
                method: method as "STEM_CUTTING",
                note: note || undefined,
              })}
              disabled={createMutation.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-leaf py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
            >
              {createMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Создать
            </button>
          </div>
        </div>
      )}

      {/* Active propagations */}
      {active.length > 0 && (
        <div className="mt-2 space-y-2">
          {active.map((prop) => (
            <PropagationCard
              key={prop.id}
              prop={prop}
              onUpdateStatus={(status) => updateStatusMutation.mutate({ id: prop.id, status })}
              onDelete={() => deleteMutation.mutate({ id: prop.id })}
              isUpdating={updateStatusMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Completed propagations */}
      {completed.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Завершённые</p>
          <div className="space-y-2">
            {completed.map((prop) => (
              <PropagationCard
                key={prop.id}
                prop={prop}
                onDelete={() => deleteMutation.mutate({ id: prop.id })}
                isUpdating={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(propagations ?? []).length === 0 && !showForm && (
        <div className="mt-2 flex flex-col items-center py-4 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf/10">
            <GitBranch size={18} className="text-leaf" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Записывайте черенки, деления и другие способы размножения
          </p>
        </div>
      )}
    </div>
  );
}

function PropagationCard({
  prop,
  onUpdateStatus,
  onDelete,
  isUpdating,
}: {
  prop: {
    id: string;
    method: string;
    status: string;
    startedAt: Date;
    rootedAt: Date | null;
    plantedAt: Date | null;
    note: string | null;
  };
  onUpdateStatus?: (status: "STARTED" | "ROOTING" | "ROOTED" | "PLANTED" | "FAILED") => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const [showActions, setShowActions] = useState(false);

  const methodLabel = PROP_METHODS.find((m) => m.value === prop.method)?.label ?? prop.method;
  const statusInfo = PROP_STATUSES.find((s) => s.value === prop.status) ?? PROP_STATUSES[0];
  const daysSinceStart = Math.floor((Date.now() - new Date(prop.startedAt).getTime()) / (1000 * 60 * 60 * 24));
  const isFinished = prop.status === "PLANTED" || prop.status === "FAILED";

  // Next possible statuses (forward progression + fail)
  const nextStatuses = isFinished
    ? []
    : PROP_STATUSES.filter((s) => {
        const order = ["STARTED", "ROOTING", "ROOTED", "PLANTED"];
        const currentIdx = order.indexOf(prop.status);
        const nextIdx = order.indexOf(s.value);
        return nextIdx > currentIdx || s.value === "FAILED";
      });

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 transition-all",
        isFinished ? "bg-muted/50 border-border/20" : "bg-surface border-border/30"
      )}
      style={!isFinished ? { boxShadow: "var(--shadow-card)" } : undefined}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${statusInfo.color}15` }}
        >
          <GitBranch size={14} style={{ color: statusInfo.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold">{methodLabel}</p>
            <span
              className="rounded-md px-1.5 py-0.5 text-[9px] font-bold"
              style={{ color: statusInfo.color, backgroundColor: `${statusInfo.color}15` }}
            >
              {statusInfo.label}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {daysSinceStart} дн. назад
            {prop.rootedAt && ` · укоренилось ${format(new Date(prop.rootedAt), "d MMM", { locale: ru })}`}
          </p>
          {prop.note && (
            <p className="mt-1 text-[11px] text-foreground-secondary">{prop.note}</p>
          )}
        </div>
        <button
          onClick={() => setShowActions(!showActions)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground"
        >
          <ChevronDown size={12} className={cn("transition-transform", showActions && "rotate-180")} />
        </button>
      </div>

      {/* Actions dropdown */}
      {showActions && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/20 pt-2">
          {nextStatuses.map((s) => (
            <button
              key={s.value}
              onClick={() => onUpdateStatus?.(s.value as "STARTED")}
              disabled={isUpdating}
              className="rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition-all active:scale-95 disabled:opacity-40"
              style={{ color: s.color, backgroundColor: `${s.color}12` }}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={onDelete}
            className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-500 transition-all active:scale-95 hover:bg-red-100"
          >
            Удалить
          </button>
        </div>
      )}
    </div>
  );
}

/* ========== Growth Tab with Chart + Add Form ========== */

function GrowthTab({
  plantId,
  records,
}: {
  plantId: string;
  records: { id: string; recordedAt: Date; heightCm: number | null; leafCount: number | null; diameterCm: number | null; note: string | null }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [heightCm, setHeightCm] = useState("");
  const [leafCount, setLeafCount] = useState("");
  const [chartMetric, setChartMetric] = useState<"height" | "leaves">("height");
  const utils = trpc.useUtils();

  const addRecord = trpc.growth.create.useMutation({
    onSuccess: () => {
      utils.plants.getById.invalidate({ id: plantId });
      setShowForm(false);
      setHeightCm("");
      setLeafCount("");
    },
  });

  const hasHeight = records.some((r) => r.heightCm != null);
  const hasLeaves = records.some((r) => r.leafCount != null);

  return (
    <div className="animate-fade-up space-y-4">
      {/* Chart */}
      {records.length >= 2 && (hasHeight || hasLeaves) && (
        <div className="rounded-2xl bg-surface border border-border/30 p-3" style={{ boxShadow: "var(--shadow-card)" }}>
          {hasHeight && hasLeaves && (
            <div className="mb-2 flex gap-1">
              {(["height", "leaves"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setChartMetric(m)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all",
                    chartMetric === m
                      ? "bg-leaf/10 text-leaf"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === "height" ? "Высота" : "Листья"}
                </button>
              ))}
            </div>
          )}
          <GrowthChart
            records={records.map((r) => ({ ...r, recordedAt: String(r.recordedAt) }))}
            metric={hasHeight ? chartMetric : "leaves"}
          />
        </div>
      )}

      {/* Add record button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-leaf/30 bg-leaf/5 py-3 text-xs font-semibold text-leaf transition-colors hover:bg-leaf/10"
        >
          <Plus size={14} />
          Добавить замер
        </button>
      ) : (
        <div className="rounded-2xl bg-surface border border-border/30 p-4 space-y-3" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-bold">Новый замер</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Высота (см)</label>
              <div className="relative">
                <Ruler size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border/60 bg-surface py-2 pl-8 pr-3 text-sm focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Листья (шт)</label>
              <div className="relative">
                <Leaf size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  value={leafCount}
                  onChange={(e) => setLeafCount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border/60 bg-surface py-2 pl-8 pr-3 text-sm focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-xl border border-border/50 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              Отмена
            </button>
            <button
              onClick={() => {
                addRecord.mutate({
                  plantId,
                  heightCm: heightCm ? parseFloat(heightCm) : undefined,
                  leafCount: leafCount ? parseInt(leafCount) : undefined,
                });
              }}
              disabled={(!heightCm && !leafCount) || addRecord.isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-leaf py-2 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
            >
              {addRecord.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Records list */}
      {records.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-leaf/10">
            <TrendingUp size={24} className="text-leaf" />
          </div>
          <p className="mt-3 text-sm font-semibold">Пока нет замеров</p>
          <p className="mt-1 text-xs text-muted-foreground">Добавьте первый замер роста</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record.id}
              className="flex items-center gap-3 rounded-2xl bg-surface border border-border/30 p-3"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf/10">
                <TrendingUp size={16} className="text-leaf" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(record.recordedAt), "d MMMM yyyy", { locale: ru })}
                </p>
                <div className="mt-0.5 flex gap-3 text-sm font-medium">
                  {record.heightCm && <span>{record.heightCm} см</span>}
                  {record.leafCount && <span>{record.leafCount} листов</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  ImageIcon,
  Loader2,
  X,
  Check,
  Leaf,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Zap,
  Droplets,
  Sun,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCamera } from "@/hooks/useCamera";
import { trpc } from "@/trpc/client";
import { WishlistButton } from "@/components/WishlistButton";

type ScanStage = "idle" | "preview" | "scanning" | "results" | "error";

interface PlantCandidate {
  score: number;
  scientificName: string;
  commonNames: string[];
  family: string;
  imageUrl: string | null;
  /** Matched species from our DB (if found) */
  speciesId?: string;
  speciesData?: {
    commonNameRu: string | null;
    waterNeed: number;
    lightNeed: number;
    humidityNeed: number;
    imageUrl: string | null;
    thumbnailUrl: string | null;
  };
}

export default function ScannerPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [stage, setStage] = useState<ScanStage>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PlantCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [organ, setOrgan] = useState<"leaf" | "flower" | "fruit" | "bark">("leaf");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    videoRef,
    canvasRef,
    isStreaming,
    error: cameraError,
    startCamera,
    stopCamera,
    capturePhoto,
  } = useCamera();

  const createPlant = trpc.plants.create.useMutation({
    onSuccess: (plant) => router.push(`/plants/${plant.id}`),
  });

  const utils = trpc.useUtils();

  // Start camera when mode = camera and stage is idle
  useEffect(() => {
    if (mode === "camera" && stage === "idle") {
      startCamera();
    }
    return () => {
      if (mode === "camera") stopCamera();
    };
  }, [mode, stage, startCamera, stopCamera]);

  const handleCapture = useCallback(() => {
    const photo = capturePhoto();
    if (photo) {
      setCapturedImage(photo);
      stopCamera();
      setStage("preview");
    }
  }, [capturePhoto, stopCamera]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
      setStage("preview");
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }, []);

  const handleScan = useCallback(async () => {
    if (!capturedImage) return;
    setStage("scanning");

    try {
      const res = await fetch("/api/plantnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedImage, organ }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Ошибка ${res.status}`);
      }

      const data = await res.json();
      const results: PlantCandidate[] = (data.results ?? []).map(
        (r: {
          score: number;
          species: {
            scientificNameWithoutAuthor: string;
            commonNames: string[];
            family: { scientificNameWithoutAuthor: string };
          };
          images: { url: { m: string } }[];
        }) => ({
          score: Math.round(r.score * 100),
          scientificName: r.species.scientificNameWithoutAuthor,
          commonNames: r.species.commonNames,
          family: r.species.family.scientificNameWithoutAuthor,
          imageUrl: r.images?.[0]?.url?.m ?? null,
        })
      );

      // Look up matching species in our DB
      if (results.length > 0) {
        try {
          const names = results.map((r) => r.scientificName);
          const speciesMap = await utils.species.findByScientificNames.fetch({ names });
          for (const r of results) {
            const match = speciesMap[r.scientificName.toLowerCase()];
            if (match) {
              r.speciesId = match.id;
              r.speciesData = {
                commonNameRu: match.commonNameRu,
                waterNeed: match.waterNeed,
                lightNeed: match.lightNeed,
                humidityNeed: match.humidityNeed,
                imageUrl: match.imageUrl,
                thumbnailUrl: match.thumbnailUrl,
              };
            }
          }
        } catch {
          // Non-critical: continue without species matching
        }
      }

      setCandidates(results);
      setStage(results.length > 0 ? "results" : "error");
      if (results.length === 0) setErrorMessage("Не удалось определить растение. Попробуйте другое фото.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Неизвестная ошибка");
      setStage("error");
    }
  }, [capturedImage, organ]);

  const handleReset = useCallback(() => {
    setCapturedImage(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setErrorMessage("");
    setStage("idle");
  }, []);

  const handleAddToGarden = useCallback(
    (candidate: PlantCandidate) => {
      if (candidate.speciesId) {
        // Matched to our DB — create with speciesId for care recommendations
        createPlant.mutate({
          speciesId: candidate.speciesId,
          nickname: candidate.speciesData?.commonNameRu ?? candidate.commonNames[0] ?? undefined,
        });
      } else {
        // Not in our DB — create with customName only
        createPlant.mutate({
          customName: candidate.commonNames[0] ?? candidate.scientificName,
        });
      }
    },
    [createPlant]
  );

  const ORGANS = [
    { id: "leaf" as const, label: "Лист" },
    { id: "flower" as const, label: "Цветок" },
    { id: "fruit" as const, label: "Плод" },
    { id: "bark" as const, label: "Кора" },
  ];

  return (
    <div className="mx-auto max-w-md pb-24">
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top nav */}
      <div className="animate-fade-in flex items-center justify-between px-4 pt-12">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-base font-semibold">Сканер</h2>
        <div className="w-9" />
      </div>

      {/* Camera / Upload / Preview / Results */}
      {stage === "idle" && (
        <>
          {/* Mode toggle */}
          <div className="animate-fade-up mx-4 mt-4">
            <div className="flex rounded-2xl bg-greenhouse/60 p-1">
              {[
                { id: "camera" as const, label: "Камера", icon: Camera },
                { id: "upload" as const, label: "Галерея", icon: ImageIcon },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    setMode(id);
                    if (id === "upload") stopCamera();
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-250",
                    mode === id
                      ? "bg-surface text-leaf"
                      : "text-muted-foreground hover:text-foreground-secondary"
                  )}
                  style={mode === id ? { boxShadow: "0 1px 4px rgba(27,94,32,0.1)" } : undefined}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Organ selector */}
          <div className="animate-fade-up mx-4 mt-3 flex gap-2" style={{ animationDelay: "40ms" }}>
            {ORGANS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOrgan(o.id)}
                className={cn(
                  "flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all",
                  organ === o.id
                    ? "bg-leaf/10 text-leaf border border-leaf/20"
                    : "bg-surface border border-border/40 text-muted-foreground"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Viewfinder */}
          <div className="animate-scale-in mx-4 mt-4" style={{ animationDelay: "80ms" }}>
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted">
              {mode === "camera" ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      "h-full w-full object-cover transition-opacity duration-300",
                      isStreaming ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {!isStreaming && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Loader2 size={32} className="animate-spin text-leaf/40" />
                      <p className="text-xs text-muted-foreground">Подключение к камере...</p>
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
                      <AlertTriangle size={32} className="text-amber-500" />
                      <p className="text-sm font-medium text-foreground-secondary">{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="mt-2 rounded-xl bg-leaf px-4 py-2 text-xs font-semibold text-white"
                      >
                        Повторить
                      </button>
                    </div>
                  )}

                  {/* Scanning frame corners */}
                  {isStreaming && (
                    <div className="absolute inset-8 pointer-events-none">
                      <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-2 border-t-2 border-white/50" />
                      <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-2 border-t-2 border-white/50" />
                      <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-white/50" />
                      <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-white/50" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-greenhouse">
                    <ImageIcon size={32} className="text-stem" />
                  </div>
                  <p className="text-sm font-medium text-foreground-secondary">
                    Выберите фото растения
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl bg-leaf px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
                    style={{ boxShadow: "0 2px 8px rgba(27,94,32,0.25)" }}
                  >
                    Выбрать из галереи
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Capture controls */}
          {mode === "camera" && isStreaming && (
            <div className="animate-fade-up mt-6 flex items-center justify-center gap-8 pb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-surface border border-border/50 transition-colors hover:bg-muted"
              >
                <ImageIcon size={20} className="text-foreground-secondary" />
              </button>

              <button
                onClick={handleCapture}
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full",
                  "bg-leaf text-white ring-4 ring-leaf/20",
                  "transition-all duration-200 active:scale-90"
                )}
              >
                <Camera size={24} />
              </button>

              <div className="w-12" />
            </div>
          )}
        </>
      )}

      {/* Preview stage */}
      {stage === "preview" && capturedImage && (
        <div className="animate-fade-up mx-4 mt-5">
          <div className="relative overflow-hidden rounded-3xl">
            <img
              src={capturedImage}
              alt="Preview"
              className="aspect-[3/4] w-full object-cover"
            />
            {/* Overlay controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-5">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleReset}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white transition-all active:scale-90"
                >
                  <RotateCcw size={20} />
                </button>
                <button
                  onClick={handleScan}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-6 py-3.5",
                    "bg-leaf text-white font-semibold text-sm",
                    "transition-all duration-200 active:scale-95"
                  )}
                  style={{ boxShadow: "0 4px 16px rgba(27,94,32,0.35)" }}
                >
                  <Zap size={16} />
                  Определить растение
                </button>
              </div>
            </div>
          </div>

          {/* Organ selector in preview */}
          <div className="mt-3 flex gap-2">
            {ORGANS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOrgan(o.id)}
                className={cn(
                  "flex-1 rounded-xl py-1.5 text-xs font-semibold transition-all",
                  organ === o.id
                    ? "bg-leaf/10 text-leaf border border-leaf/20"
                    : "bg-surface border border-border/40 text-muted-foreground"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scanning animation */}
      {stage === "scanning" && (
        <div className="animate-scale-in mx-4 mt-5">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl">
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Scanning"
                className="h-full w-full object-cover"
              />
            )}
            {/* Scanning overlay */}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-4">
              {/* Animated scan line */}
              <div className="absolute inset-x-8 top-8 bottom-8">
                <div className="scan-line absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-leaf to-transparent" />
              </div>

              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-leaf/20 animate-pulse flex items-center justify-center">
                  <Leaf size={32} className="text-leaf animate-bounce" />
                </div>
              </div>
              <p className="text-white font-semibold text-sm">Анализируем фото...</p>
              <p className="text-white/60 text-xs">Сравниваем с базой PlantNet</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {stage === "results" && (
        <div className="animate-fade-up mx-4 mt-5 space-y-3">
          {/* Mini preview */}
          {capturedImage && (
            <div className="flex items-center gap-3 rounded-2xl bg-surface border border-border/40 p-2.5" style={{ boxShadow: "var(--shadow-card)" }}>
              <img
                src={capturedImage}
                alt="Scanned"
                className="h-14 w-14 rounded-xl object-cover"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">Результаты сканирования</p>
                <p className="text-xs text-muted-foreground">
                  Найдено {candidates.length} совпадений
                </p>
              </div>
              <button
                onClick={handleReset}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Candidate list */}
          {candidates.map((candidate, i) => {
            const isSelected = selectedCandidate === i;
            const hasMatch = !!candidate.speciesId;
            const displayImage = candidate.speciesData?.thumbnailUrl ?? candidate.speciesData?.imageUrl ?? candidate.imageUrl;
            return (
              <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <button
                  onClick={() => setSelectedCandidate(isSelected ? null : i)}
                  className={cn(
                    "w-full text-left rounded-2xl p-3.5 transition-all duration-250",
                    isSelected
                      ? "bg-leaf/6 border-2 border-leaf/30"
                      : hasMatch
                        ? "bg-surface border border-leaf/20 hover:border-leaf/30"
                        : "bg-surface border border-border/40 hover:border-leaf/20"
                  )}
                  style={!isSelected ? { boxShadow: "var(--shadow-card)" } : undefined}
                >
                  <div className="flex items-center gap-3">
                    {/* Image or placeholder */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-greenhouse">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={candidate.scientificName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Leaf size={20} className="text-stem/40" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold">
                          {candidate.speciesData?.commonNameRu ?? candidate.commonNames[0] ?? candidate.scientificName}
                        </p>
                        {/* Score badge */}
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                            candidate.score >= 70
                              ? "bg-leaf/10 text-leaf"
                              : candidate.score >= 40
                                ? "bg-amber-50 text-amber-600"
                                : "bg-red-50 text-red-500"
                          )}
                        >
                          {candidate.score}%
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs italic text-muted-foreground">
                        {candidate.scientificName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {candidate.family}
                        {candidate.commonNames.length > 1 &&
                          ` · ${candidate.commonNames.slice(1, 3).join(", ")}`}
                      </p>
                    </div>

                    <ChevronRight
                      size={16}
                      className={cn(
                        "shrink-0 transition-transform",
                        isSelected ? "rotate-90 text-leaf" : "text-muted-foreground"
                      )}
                    />
                  </div>

                  {/* DB match badge */}
                  {hasMatch && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-leaf/8 px-2 py-1">
                      <Sparkles size={11} className="text-leaf" />
                      <span className="text-[10px] font-semibold text-leaf">В нашем каталоге — с рекомендациями ухода</span>
                    </div>
                  )}

                  {/* Care indicators for matched species */}
                  {isSelected && hasMatch && candidate.speciesData && (
                    <div className="mt-2 flex gap-3 rounded-xl bg-greenhouse/50 px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Droplets size={12} className="text-[#1B5E20]" />
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Полив: {candidate.speciesData.waterNeed}/5
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Sun size={12} className="text-amber-600" />
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Свет: {candidate.speciesData.lightNeed}/5
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Not in DB notice */}
                  {isSelected && !hasMatch && (
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1">
                      <AlertTriangle size={11} className="text-amber-500" />
                      <span className="text-[10px] font-medium text-amber-700">
                        Вид не в каталоге — добавится без рекомендаций ухода
                      </span>
                    </div>
                  )}

                  {/* Expanded actions */}
                  {isSelected && (
                    <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToGarden(candidate);
                        }}
                        disabled={createPlant.isPending}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-xl py-2.5",
                          "bg-leaf text-white text-xs font-semibold",
                          "transition-all active:scale-95 disabled:opacity-60"
                        )}
                        style={{ boxShadow: "0 2px 8px rgba(27,94,32,0.25)" }}
                      >
                        {createPlant.isPending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} strokeWidth={2.5} />
                        )}
                        Добавить в сад
                      </button>
                      {candidate.speciesId && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <WishlistButton speciesId={candidate.speciesId} variant="full" />
                        </div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}

          {/* Rescan button */}
          <button
            onClick={handleReset}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/50 bg-surface py-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-leaf"
          >
            <RotateCcw size={14} />
            Сканировать ещё раз
          </button>
        </div>
      )}

      {/* Error state */}
      {stage === "error" && (
        <div className="animate-scale-in mx-4 mt-12 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <p className="mt-5 text-base font-bold tracking-tight">Не удалось определить</p>
          <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
            {errorMessage || "Попробуйте сделать более чёткое фото листа или цветка растения"}
          </p>
          <button
            onClick={handleReset}
            className={cn(
              "mt-5 flex items-center gap-2 rounded-2xl px-6 py-3",
              "bg-leaf text-white text-sm font-semibold",
              "transition-all active:scale-95"
            )}
          >
            <RotateCcw size={16} />
            Попробовать снова
          </button>
        </div>
      )}

      {/* Inline styles for scan line animation */}
      <style jsx>{`
        .scan-line {
          animation: scanMove 2s ease-in-out infinite;
        }
        @keyframes scanMove {
          0%,
          100% {
            top: 0;
          }
          50% {
            top: calc(100% - 2px);
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Camera,
  ImagePlus,
  Loader2,
  Stethoscope,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagnosisModalProps {
  open: boolean;
  onClose: () => void;
  plantId: string;
  plantName: string;
  existingPhotos?: { id: string; url: string }[];
}

export function DiagnosisModal({ open, onClose, plantId, plantName, existingPhotos }: DiagnosisModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll diagnosis as it streams
  useEffect(() => {
    if (scrollRef.current && diagnosis) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [diagnosis]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      // Delay reset so closing animation plays
      const t = setTimeout(() => {
        setSelectedImage(null);
        setPreviewUrl(null);
        setDiagnosis("");
        setError(null);
        setShowGallery(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Изображение слишком большое. Максимум 10МБ.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      setPreviewUrl(base64);
      setError(null);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleGallerySelect = useCallback(async (photoUrl: string) => {
    setShowGallery(false);
    setError(null);
    setPreviewUrl(photoUrl);

    try {
      // Fetch the photo and convert to base64
      const res = await fetch(photoUrl);
      if (!res.ok) throw new Error("Failed to fetch photo");
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch {
      setError("Не удалось загрузить фото из галереи.");
      setPreviewUrl(null);
    }
  }, []);

  const runDiagnosis = useCallback(async () => {
    if (!selectedImage || isLoading) return;

    setDiagnosis("");
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId, image: selectedImage }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError("Сессия истекла. Войдите снова.");
        } else if (res.status === 429) {
          setError("Слишком много запросов. Попробуйте через час.");
        } else {
          setError("Не удалось выполнить диагностику. Попробуйте позже.");
        }
        setIsLoading(false);
        return;
      }

      // Parse SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              const delta =
                parsed.type === "content_block_delta"
                  ? parsed.delta?.text
                  : undefined;
              if (delta) {
                setDiagnosis((prev) => prev + delta);
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
      }
    } catch {
      setError("Ошибка сети. Проверьте подключение и попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedImage, isLoading, plantId]);

  const handleReset = useCallback(() => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setDiagnosis("");
    setError(null);
  }, []);

  if (!open) return null;

  const hasPhotos = existingPhotos && existingPhotos.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative mt-auto flex max-h-[90vh] flex-col rounded-t-3xl bg-surface animate-sheet lg:m-auto lg:max-h-[85vh] lg:w-full lg:max-w-xl lg:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <Stethoscope size={14} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold">AI Диагностика</p>
              <p className="text-[10px] text-muted-foreground">{plantName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted transition-colors hover:bg-red-50"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* No image selected — show capture options */}
          {!previewUrl && !diagnosis && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-50 to-orange-100">
                <Stethoscope size={28} className="text-amber-600" />
              </div>
              <p className="mt-4 text-sm font-semibold">
                Сфотографируйте растение
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">
                AI проанализирует фото и определит состояние здоровья, найдёт проблемы и даст рекомендации
              </p>

              <div className="mt-6 flex flex-col gap-3 w-full max-w-[280px]">
                {/* Take photo */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-white transition-all active:scale-95"
                >
                  <Camera size={18} />
                  Сделать фото
                </button>

                {/* Pick from gallery */}
                {hasPhotos && (
                  <button
                    onClick={() => setShowGallery(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-border/50 bg-surface px-4 py-3.5 text-sm font-semibold text-foreground transition-all active:scale-95 hover:bg-muted"
                  >
                    <ImagePlus size={18} />
                    Выбрать из галереи
                  </button>
                )}
              </div>

              {/* Gallery picker */}
              {showGallery && hasPhotos && (
                <div className="mt-4 w-full">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground text-left">Фото растения:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => handleGallerySelect(photo.url)}
                        className="aspect-square overflow-hidden rounded-2xl bg-muted transition-all hover:ring-2 hover:ring-amber-400 active:scale-95"
                      >
                        <img src={photo.url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image selected — show preview and analyze button */}
          {previewUrl && !diagnosis && !isLoading && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-muted">
                <img src={previewUrl} alt="Фото для диагностики" className="w-full max-h-64 object-contain" />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70"
                >
                  <X size={14} />
                </button>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={runDiagnosis}
                disabled={!selectedImage}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
              >
                <Stethoscope size={18} />
                Начать диагностику
              </button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && !diagnosis && (
            <div className="space-y-4">
              {previewUrl && (
                <div className="overflow-hidden rounded-2xl bg-muted">
                  <img src={previewUrl} alt="" className="w-full max-h-48 object-contain opacity-60" />
                </div>
              )}
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 size={20} className="animate-spin text-amber-500" />
                <p className="text-sm font-medium text-muted-foreground">Анализирую фото...</p>
              </div>
            </div>
          )}

          {/* Diagnosis result */}
          {(diagnosis || (isLoading && diagnosis)) && (
            <div className="space-y-4">
              {previewUrl && (
                <div className="overflow-hidden rounded-2xl bg-muted">
                  <img src={previewUrl} alt="" className="w-full max-h-48 object-contain" />
                </div>
              )}

              <div className="rounded-2xl bg-greenhouse p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope size={14} className="text-amber-600" />
                  <p className="text-xs font-bold text-amber-700">Результат диагностики</p>
                  {isLoading && <Loader2 size={12} className="animate-spin text-amber-500" />}
                </div>
                <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {diagnosis}
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 font-medium">
                  {error}
                </div>
              )}

              {!isLoading && (
                <button
                  onClick={handleReset}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/50 bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-all active:scale-95 hover:bg-muted"
                >
                  <RotateCcw size={16} />
                  Новая диагностика
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

    </div>
  );
}

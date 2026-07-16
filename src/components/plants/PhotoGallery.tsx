"use client";

import { useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Camera,
  Loader2,
  Star,
  X,
  Leaf,
  ImagePlus,
  Images,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  url: string;
  isCover: boolean;
}

interface CatalogPhoto {
  id: string;
  url: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  speciesImageUrl?: string | null;
  speciesThumbnailUrl?: string | null;
  speciesCatalogPhotos?: CatalogPhoto[];
  plantName: string;
  uploading: boolean;
  onUpload: () => void;
  onSetCover: (photoId: string) => void;
  onDelete: (photoId: string) => void;
  className?: string;
}

export function PhotoGallery({
  photos,
  speciesImageUrl,
  speciesThumbnailUrl,
  speciesCatalogPhotos,
  plantName,
  uploading,
  onUpload,
  onSetCover,
  onDelete,
  className,
}: PhotoGalleryProps) {
  // Build combined image list: user photos first, then species photos as fallback
  const speciesImages: { id: string; url: string; isCover: boolean; isSpecies: boolean }[] = [];
  if (photos.length === 0) {
    // No user photos — use species images
    if (speciesImageUrl) {
      speciesImages.push({ id: "__species_main__", url: speciesImageUrl, isCover: false, isSpecies: true });
    }
    if (speciesCatalogPhotos) {
      for (const cp of speciesCatalogPhotos) {
        if (cp.url !== speciesImageUrl) {
          speciesImages.push({ id: `__species_${cp.id}__`, url: cp.url, isCover: false, isSpecies: true });
        }
      }
    }
  }

  const userPhotos = photos.map((p) => ({ ...p, isSpecies: false }));
  const allImages = userPhotos.length > 0 ? userPhotos : speciesImages;
  const hasUserPhotos = userPhotos.length > 0;

  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(0, allImages.length - 1));
  const thumbsRef = useRef<HTMLDivElement>(null);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  const currentImage = allImages[safeIndex];

  return (
    <div className={className ?? "mx-4 mt-4"}>
      {/* Gallery frame */}
      <div className="rounded-3xl border border-border/40 overflow-hidden bg-surface" style={{ boxShadow: "var(--shadow-card)" }}>
        {/* Main image */}
        <div className="animate-scale-in relative bg-gradient-to-b from-muted to-greenhouse">
          {currentImage ? (
            <img
              src={currentImage.url}
              alt={plantName}
              className="h-72 w-full object-cover transition-opacity duration-300"
            />
          ) : (
            <div className="flex h-72 items-center justify-center">
              <svg viewBox="0 0 120 160" className="h-48 w-36 text-stem/30" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M60 160V60" strokeLinecap="round" />
                <path d="M60 60C60 60 30 48 20 24C10 0 30 -4 46 12C62 28 60 60 60 60Z" fill="currentColor" opacity="0.15" />
                <path d="M60 80C60 80 90 68 100 44C110 20 90 16 74 32C58 48 60 80 60 80Z" fill="currentColor" opacity="0.1" />
                <path d="M60 100C60 100 36 92 28 72C20 52 36 48 48 60C60 72 60 100 60 100Z" fill="currentColor" opacity="0.12" />
              </svg>
            </div>
          )}

          {/* Navigation arrows */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-black/50 active:scale-90"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-all hover:bg-black/50 active:scale-90"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}

          {/* Image counter badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-0.5 backdrop-blur-sm">
            <Images size={10} className="text-white/80" />
            <span className="text-[10px] font-bold text-white">
              {allImages.length > 1 ? `${safeIndex + 1}/${allImages.length}` : `${allImages.length}`}
            </span>
          </div>

          {/* Upload button */}
          <button
            onClick={onUpload}
            disabled={uploading}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70 active:scale-90 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
          </button>
        </div>

        {/* Thumbnail strip inside frame */}
        {allImages.length > 1 && (
          <div
            ref={thumbsRef}
            className="flex gap-2 overflow-x-auto p-2.5 bg-surface scrollbar-none"
          >
            {allImages.map((img, idx) => (
              <div key={img.id} className="group relative flex-shrink-0">
                <button
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "h-14 w-14 overflow-hidden rounded-xl border-2 transition-all",
                    idx === safeIndex
                      ? "border-leaf ring-2 ring-leaf/20"
                      : "border-transparent hover:border-border"
                  )}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
                {/* Hover actions — only for user photos */}
                {hasUserPhotos && !img.isSpecies && (
                  <div className="absolute inset-0 flex items-center justify-center gap-0.5 rounded-xl bg-black/0 opacity-0 group-hover:bg-black/40 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => onSetCover(img.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-leaf"
                      title="Сделать обложкой"
                    >
                      <Star size={11} />
                    </button>
                    <button
                      onClick={() => onDelete(img.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-red-500"
                      title="Удалить"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {/* Add photo thumb */}
            <button
              onClick={onUpload}
              disabled={uploading}
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-leaf/30 bg-leaf/5 text-leaf transition-all hover:bg-leaf/10"
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            </button>
          </div>
        )}

        {/* Single image — show add photo prompt */}
        {allImages.length <= 1 && (
          <div className="flex items-center justify-between px-3 py-2.5 bg-surface border-t border-border/30">
            <span className="text-[10px] font-medium text-muted-foreground">
              {hasUserPhotos ? "1 фото" : "Фото из каталога"}
            </span>
            <button
              onClick={onUpload}
              disabled={uploading}
              className="flex items-center gap-1 rounded-lg bg-leaf/10 px-2.5 py-1 text-[10px] font-bold text-leaf transition-colors hover:bg-leaf/15"
            >
              {uploading ? <Loader2 size={10} className="animate-spin" /> : <ImagePlus size={10} />}
              Добавить фото
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

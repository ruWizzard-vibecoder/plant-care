"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import { Sun, Droplets, Smile, Check, Home, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface CareLevel {
  icon: React.ElementType;
  label: string;
  level: number; // 1-5
  color: string;
}

interface PlantCardProps {
  id: string;
  name: string;
  species?: string;
  imageUrl?: string | null;
  waterNeed?: number;
  lightNeed?: number;
  happiness?: number;
  roomName?: string;
  isFavorite?: boolean;
  className?: string;
  selectionMode?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onLongPress?: (id: string) => void;
}

function CareIndicator({ icon: Icon, label, level, color }: CareLevel) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full",
          "border-2 transition-colors duration-300"
        )}
        style={{ borderColor: color }}
      >
        <Icon size={15} style={{ color }} strokeWidth={2} />
      </div>
      <span className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

export function PlantCard({
  id,
  name,
  species,
  imageUrl,
  waterNeed = 3,
  lightNeed = 3,
  happiness = 4,
  roomName,
  isFavorite,
  className,
  selectionMode,
  selected,
  onSelect,
  onLongPress,
}: PlantCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handlePointerDown = useCallback(() => {
    if (selectionMode) return;
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress?.(id);
    }, 500);
  }, [selectionMode, id, onLongPress]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (didLongPress.current) {
        e.preventDefault();
        return;
      }
      if (selectionMode) {
        e.preventDefault();
        onSelect?.(id);
      }
    },
    [selectionMode, id, onSelect]
  );

  const careLevels: CareLevel[] = [
    {
      icon: Sun,
      label: "Свет",
      level: lightNeed,
      color: lightNeed >= 4 ? "#FF8F00" : lightNeed >= 2 ? "#81C784" : "#90A4AE",
    },
    {
      icon: Droplets,
      label: "Вода",
      level: waterNeed,
      color: waterNeed >= 4 ? "#1B5E20" : waterNeed >= 2 ? "#4CAF50" : "#90A4AE",
    },
    {
      icon: Smile,
      label: "Состояние",
      level: happiness,
      color: happiness >= 4 ? "#1B5E20" : happiness >= 2 ? "#FF8F00" : "#E53935",
    },
  ];

  const content = (
    <>
      {/* Plant image + selection checkbox */}
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              viewBox="0 0 64 64"
              className="h-14 w-14 text-stem/40"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M32 56V28" strokeLinecap="round" />
              <path d="M32 28C32 28 20 24 16 14C12 4 22 2 28 8C34 14 32 28 32 28Z" />
              <path d="M32 36C32 36 44 32 48 22C52 12 42 10 36 16C30 22 32 36 32 36Z" />
            </svg>
          </div>
        )}
        {isFavorite && !selectionMode && (
          <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/90 shadow-sm">
            <Star size={10} className="text-white" fill="currentColor" />
          </div>
        )}
        {/* Desktop hover checkbox — enters the same selection mode as mobile long-press */}
        {!selectionMode && onLongPress && (
          <button
            type="button"
            aria-label="Выбрать растение"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLongPress(id);
            }}
            className="absolute left-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white/70 opacity-0 backdrop-blur-sm transition-opacity hover:bg-white lg:flex lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
          />
        )}
        {selectionMode && (
          <div className="absolute inset-0 bg-black/10 transition-all">
            <div
              className={cn(
                "absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                selected
                  ? "border-leaf bg-leaf text-white"
                  : "border-white bg-white/60"
              )}
            >
              {selected && <Check size={13} strokeWidth={3} />}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <h3 className="truncate text-base font-semibold leading-tight text-foreground">
            {name}
          </h3>
          {species && (
            <p className="mt-0.5 truncate text-xs tracking-widest text-muted-foreground uppercase">
              {species}
            </p>
          )}
          {roomName && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-leaf/8 px-1.5 py-0.5 text-[10px] font-medium text-leaf/80">
              <Home size={8} />
              {roomName}
            </span>
          )}
        </div>

        {/* Care indicators */}
        <div className="mt-2 flex gap-4">
          {careLevels.map((care) => (
            <CareIndicator key={care.label} {...care} />
          ))}
        </div>
      </div>
    </>
  );

  const sharedClassName = cn(
    "group card-lift flex gap-4 rounded-[var(--radius-card)] bg-surface p-4",
    "border transition-all",
    selected ? "border-leaf/50 bg-leaf/[0.03] ring-1 ring-leaf/20" : "border-border/50",
    className
  );

  if (selectionMode) {
    return (
      <div
        onClick={handleClick}
        className={cn(sharedClassName, "cursor-pointer")}
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={`/plants/${id}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={sharedClassName}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {content}
    </Link>
  );
}

import {
  Droplets,
  SprayCan,
  FlaskConical,
  Sprout,
  RefreshCw,
  Scissors,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface CareTypeConfig {
  icon: LucideIcon;
  label: string;
  color: string;
  bgLight: string;
}

export const CARE_TYPE_CONFIG: Record<string, CareTypeConfig> = {
  WATER: {
    icon: Droplets,
    label: "Полив",
    color: "#1B5E20",
    bgLight: "rgba(27,94,32,0.08)",
  },
  SPRAY: {
    icon: SprayCan,
    label: "Опрыскивание",
    color: "#1565C0",
    bgLight: "rgba(21,101,192,0.08)",
  },
  FERTILIZE_MINERAL: {
    icon: FlaskConical,
    label: "Мин. удобрение",
    color: "#E65100",
    bgLight: "rgba(230,81,0,0.08)",
  },
  FERTILIZE_ORGANIC: {
    icon: Sprout,
    label: "Орг. удобрение",
    color: "#795548",
    bgLight: "rgba(121,85,72,0.08)",
  },
  FERTILIZE: {
    icon: FlaskConical,
    label: "Подкормка",
    color: "#E65100",
    bgLight: "rgba(230,81,0,0.08)",
  },
  REPOT: {
    icon: RefreshCw,
    label: "Пересадка",
    color: "#BF360C",
    bgLight: "rgba(191,54,12,0.08)",
  },
  PRUNE: {
    icon: Scissors,
    label: "Обрезка",
    color: "#AD1457",
    bgLight: "rgba(173,20,87,0.08)",
  },
  CUSTOM: {
    icon: Wrench,
    label: "Другое",
    color: "#5a7a5a",
    bgLight: "rgba(90,122,90,0.08)",
  },
};

export const PLANT_CATEGORIES: Record<string, string> = {
  SUCCULENTS: "Суккуленты и кактусы",
  FOLIAGE: "Декоративно-лиственные",
  TROPICAL: "Тропические",
  FLOWERING: "Цветущие",
  FERNS: "Папоротники",
  PALMS: "Пальмы",
  CLIMBING: "Вьющиеся/ампельные",
  LARGE: "Крупномеры",
};

/** Care types relevant for plant detail "Care" tab (excluding deprecated FERTILIZE) */
export const PLANT_CARE_TYPES = [
  "WATER",
  "SPRAY",
  "FERTILIZE_MINERAL",
  "FERTILIZE_ORGANIC",
  "REPOT",
  "PRUNE",
] as const;

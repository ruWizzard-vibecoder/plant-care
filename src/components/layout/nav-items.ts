import {
  Home,
  Leaf,
  ScanLine,
  Users,
  User,
  BookOpen,
  CalendarDays,
  DoorOpen,
  Trophy,
  Heart,
} from "lucide-react";

export type NavItem = {
  href: string;
  icon: typeof Home;
  label: string;
  isFab?: boolean;
  badgeKey?: string;
};

// Mobile bottom navigation — 5 items, scanner as center FAB
export const BOTTOM_NAV_TABS: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Главная" },
  { href: "/plants", icon: Leaf, label: "Растения" },
  { href: "/scanner", icon: ScanLine, label: "", isFab: true },
  { href: "/friends", icon: Users, label: "Друзья", badgeKey: "friends" },
  { href: "/profile", icon: User, label: "Профиль" },
];

// Desktop sidebar — all sections (scanner rendered separately as CTA button)
export const SIDEBAR_NAV: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Главная" },
  { href: "/plants", icon: Leaf, label: "Мои растения" },
  { href: "/catalog", icon: BookOpen, label: "Каталог" },
  { href: "/calendar", icon: CalendarDays, label: "Календарь" },
  { href: "/rooms", icon: DoorOpen, label: "Комнаты" },
  { href: "/achievements", icon: Trophy, label: "Достижения" },
  { href: "/wishlist", icon: Heart, label: "Вишлист" },
  { href: "/friends", icon: Users, label: "Друзья", badgeKey: "friends" },
  { href: "/profile", icon: User, label: "Профиль" },
];

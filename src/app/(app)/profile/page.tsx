"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Droplets,
  FlaskConical,
  RefreshCw,
  Download,
  LogOut,
  Leaf,
  Loader2,
  ChevronRight,
  Smartphone,
  Clock,
  Shield,
  Home,
  ChevronUp,
  ChevronDown,
  Trophy,
  Users,
  Eye,
  CalendarDays,
  Heart,
  Unplug,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/trpc/client";

export default function ProfilePage() {
  const router = useRouter();
  const { permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } =
    usePushNotifications();
  const { canInstall, install } = usePwaInstall();
  const [loggingOut, setLoggingOut] = useState(false);

  const utils = trpc.useUtils();
  const { data: prefs } = trpc.notifications.getPrefs.useQuery(undefined, {
    enabled: isSubscribed,
  });
  const updatePrefs = trpc.notifications.updatePrefs.useMutation({
    onSuccess: () => utils.notifications.getPrefs.invalidate(),
  });

  const handleLogout = async () => {
    setLoggingOut(true);
    await authClient.signOut();
    router.push("/auth/login");
  };

  const togglePref = (key: "waterEnabled" | "fertilizeEnabled" | "repotEnabled" | "achievementsEnabled" | "communityEnabled" | "friendActivityEnabled") => {
    if (!prefs) return;
    updatePrefs.mutate({ [key]: !prefs[key] });
  };

  const changeHour = (delta: number) => {
    const current = prefs?.reminderHour ?? 9;
    const next = (current + delta + 24) % 24;
    updatePrefs.mutate({
      reminderHour: next,
      reminderTzOffset: new Date().getTimezoneOffset(),
    });
  };

  const NOTIFICATION_TYPES = [
    { icon: Droplets, label: "Полив", color: "#1B5E20", key: "waterEnabled" as const },
    { icon: FlaskConical, label: "Подкормка", color: "#E65100", key: "fertilizeEnabled" as const },
    { icon: RefreshCw, label: "Пересадка", color: "#BF360C", key: "repotEnabled" as const },
  ];

  return (
    <div className="mx-auto max-w-md px-4 pt-12 pb-8 lg:max-w-2xl">
      {/* Header */}
      <h1 className="animate-fade-up text-2xl font-bold tracking-tight">Профиль</h1>

      {/* Avatar card */}
      <div
        className="animate-fade-up mt-5 flex items-center gap-4 rounded-2xl bg-surface border border-border/40 p-4"
        style={{ animationDelay: "60ms", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-greenhouse to-dew">
          <Leaf size={28} className="text-stem" />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold">Мой сад</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Управляйте настройками и уведомлениями
          </p>
        </div>
      </div>

      {/* Rooms link */}
      <Link
        href="/rooms"
        className="animate-fade-up mt-4 flex items-center gap-3 rounded-2xl bg-surface border border-border/40 p-4 transition-colors hover:bg-greenhouse/30"
        style={{ animationDelay: "90ms", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf/10">
          <Home size={18} className="text-leaf" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Комнаты</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Температура, влажность и освещённость
          </p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </Link>

      {/* Calendar link */}
      <Link
        href="/calendar"
        className="animate-fade-up mt-2 flex items-center gap-3 rounded-2xl bg-surface border border-border/40 p-4 transition-colors hover:bg-greenhouse/30"
        style={{ animationDelay: "105ms", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf/10">
          <CalendarDays size={18} className="text-leaf" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Календарь ухода</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            История действий по дням
          </p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </Link>

      {/* Wishlist link */}
      <Link
        href="/wishlist"
        className="animate-fade-up mt-2 flex items-center gap-3 rounded-2xl bg-surface border border-border/40 p-4 transition-colors hover:bg-rose-50/30"
        style={{ animationDelay: "120ms", boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50">
          <Heart size={18} className="text-rose-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Список желаний</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Растения, которые хочется завести
          </p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </Link>

      {/* Notifications section */}
      <div className="animate-fade-up mt-6" style={{ animationDelay: "150ms" }}>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted-foreground">
          <Bell size={12} />
          Уведомления
        </h2>

        <div className="space-y-2">
          {/* Push toggle */}
          <div
            className="flex items-center gap-3 rounded-2xl bg-surface border border-border/40 p-4"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: isSubscribed ? "rgba(27,94,32,0.1)" : "rgba(0,0,0,0.04)" }}
            >
              {isSubscribed ? (
                <Bell size={18} className="text-leaf" />
              ) : (
                <BellOff size={18} className="text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Push-уведомления</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {permission === "unsupported"
                  ? "Не поддерживается в этом браузере"
                  : permission === "denied"
                    ? "Запрещены в настройках браузера"
                    : isSubscribed
                      ? "Вы получаете напоминания об уходе"
                      : "Получайте напоминания о поливе и уходе"}
              </p>
            </div>
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={pushLoading || permission === "unsupported" || permission === "denied"}
              className={cn(
                "flex h-8 items-center rounded-xl px-3 text-xs font-semibold transition-all active:scale-95",
                "disabled:opacity-40",
                isSubscribed
                  ? "bg-red-50 text-red-600"
                  : "bg-leaf text-white"
              )}
            >
              {pushLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isSubscribed ? (
                "Выкл"
              ) : (
                "Включить"
              )}
            </button>
          </div>

          {/* Notification preferences (shown when subscribed) */}
          {isSubscribed && (
            <div className="space-y-1.5 pl-1">
              {NOTIFICATION_TYPES.map((item) => {
                const enabled = prefs?.[item.key] ?? true;
                return (
                  <button
                    key={item.label}
                    onClick={() => togglePref(item.key)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-greenhouse/20"
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${item.color}12` }}
                    >
                      <item.icon size={13} style={{ color: item.color }} strokeWidth={2.2} />
                    </div>
                    <span className="flex-1 text-left text-xs font-medium">{item.label}</span>
                    <div
                      className={cn(
                        "h-5 w-9 rounded-full p-0.5 transition-colors",
                        enabled ? "bg-leaf/20" : "bg-muted"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full transition-all",
                          enabled ? "translate-x-4 bg-leaf" : "translate-x-0 bg-muted-foreground/40"
                        )}
                      />
                    </div>
                  </button>
                );
              })}

              {/* Reminder hour */}
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                  <Clock size={13} className="text-muted-foreground" />
                </div>
                <span className="flex-1 text-xs font-medium">Время напоминания</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changeHour(-1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-muted transition-colors hover:bg-leaf/10"
                  >
                    <ChevronDown size={12} />
                  </button>
                  <span className="w-10 text-center text-xs font-semibold text-leaf">
                    {String(prefs?.reminderHour ?? 9).padStart(2, "0")}:00
                  </span>
                  <button
                    onClick={() => changeHour(1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-muted transition-colors hover:bg-leaf/10"
                  >
                    <ChevronUp size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Social notification toggles (shown when subscribed) */}
          {isSubscribed && (
            <div className="mt-3 space-y-1.5 pl-1">
              <p className="px-3 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Социальные</p>
              {[
                { icon: Trophy, label: "Достижения", color: "#F59E0B", key: "achievementsEnabled" as const },
                { icon: Users, label: "Активность друзей", color: "#6366F1", key: "friendActivityEnabled" as const },
              ].map((item) => {
                const enabled = prefs?.[item.key] ?? true;
                return (
                  <button
                    key={item.label}
                    onClick={() => togglePref(item.key)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-greenhouse/20"
                  >
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${item.color}12` }}
                    >
                      <item.icon size={13} style={{ color: item.color }} strokeWidth={2.2} />
                    </div>
                    <span className="flex-1 text-left text-xs font-medium">{item.label}</span>
                    <div className={cn("h-5 w-9 rounded-full p-0.5 transition-colors", enabled ? "bg-leaf/20" : "bg-muted")}>
                      <div className={cn("h-4 w-4 rounded-full transition-all", enabled ? "translate-x-4 bg-leaf" : "translate-x-0 bg-muted-foreground/40")} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Smart Home section */}
      <SmartHomeSection />

      {/* Privacy section */}
      <div className="animate-fade-up mt-6" style={{ animationDelay: "165ms" }}>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted-foreground">
          <Eye size={12} />
          Приватность
        </h2>
        <PrivacyToggles />
      </div>

      {/* App section */}
      <div className="animate-fade-up mt-6" style={{ animationDelay: "180ms" }}>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted-foreground">
          <Smartphone size={12} />
          Приложение
        </h2>

        <div className="space-y-2">
          {/* Install PWA */}
          {canInstall && (
            <button
              onClick={install}
              className="flex w-full items-center gap-3 rounded-2xl bg-surface border border-leaf/20 p-4 text-left transition-colors hover:bg-greenhouse/40"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf/10">
                <Download size={18} className="text-leaf" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-leaf">Установить приложение</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Добавьте на главный экран для быстрого доступа
                </p>
              </div>
              <ChevronRight size={16} className="text-leaf" />
            </button>
          )}

          {/* Privacy */}
          <div
            className="flex items-center gap-3 rounded-2xl bg-surface border border-border/40 p-4"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Shield size={18} className="text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Конфиденциальность</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Все данные хранятся на вашем сервере
              </p>
            </div>
          </div>

          {/* Version */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Leaf size={12} className="text-stem/40" />
            <span className="text-[10px] text-muted-foreground">Plant Care v0.2.0</span>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="animate-fade-up mt-8" style={{ animationDelay: "240ms" }}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200/60 py-3.5",
            "text-sm font-semibold text-red-600 transition-all",
            "hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
          )}
        >
          {loggingOut ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogOut size={16} />
          )}
          Выйти
        </button>
      </div>
    </div>
  );
}

function SmartHomeSection() {
  const utils = trpc.useUtils();
  const { data: connection } = trpc.smartHome.connection.useQuery();
  const { data: connectData } = trpc.smartHome.connectUrl.useQuery();
  const [disconnecting, setDisconnecting] = useState(false);

  const disconnectMut = trpc.smartHome.disconnect.useMutation({
    onSuccess: () => {
      setDisconnecting(false);
      utils.smartHome.connection.invalidate();
      utils.rooms.list.invalidate();
    },
  });

  const handleConnect = () => {
    if (connectData?.url) {
      window.location.href = connectData.url;
    }
  };

  const handleDisconnect = () => {
    if (confirm("Отключить Яндекс Умный дом? Датчики в комнатах будут отвязаны.")) {
      setDisconnecting(true);
      disconnectMut.mutate();
    }
  };

  return (
    <div className="animate-fade-up mt-6" style={{ animationDelay: "155ms" }}>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted-foreground">
        <Wifi size={12} />
        Умный дом
      </h2>

      <div
        className="flex items-center gap-3 rounded-2xl bg-surface border border-border/40 p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: connection?.connected ? "rgba(147,51,234,0.1)" : "rgba(0,0,0,0.04)" }}
        >
          {connection?.connected ? (
            <Smartphone size={18} className="text-purple-500" />
          ) : (
            <Unplug size={18} className="text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {connection?.connected ? "Яндекс подключён" : "Яндекс Умный дом"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {connection?.connected
              ? "Датчики температуры и влажности доступны"
              : "Подключите для автоматического мониторинга"}
          </p>
        </div>
        {connection?.connected ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className={cn(
              "flex h-8 items-center rounded-xl px-3 text-xs font-semibold transition-all active:scale-95",
              "bg-red-50 text-red-600 disabled:opacity-40",
            )}
          >
            {disconnecting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              "Отключить"
            )}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={!connectData?.url}
            className={cn(
              "flex h-8 items-center rounded-xl px-3 text-xs font-semibold transition-all active:scale-95",
              "bg-purple-500 text-white disabled:opacity-40",
            )}
          >
            Подключить
          </button>
        )}
      </div>
    </div>
  );
}

function PrivacyToggles() {
  const utils = trpc.useUtils();
  const { data: privacy } = trpc.friends.privacySettings.useQuery();
  const updatePrivacy = trpc.friends.updatePrivacy.useMutation({
    onSuccess: () => utils.friends.privacySettings.invalidate(),
  });

  const togglePrivacy = (key: "shareCollection" | "shareAchievements" | "shareWishlist") => {
    if (!privacy) return;
    updatePrivacy.mutate({ [key]: !privacy[key] });
  };

  return (
    <div className="space-y-2">
      <div
        className="rounded-2xl bg-surface border border-border/40 p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <p className="text-xs text-muted-foreground mb-3">
          Управляйте тем, что видят ваши друзья
        </p>

        {[
          { label: "Показывать коллекцию", desc: "Друзья могут видеть ваши растения", key: "shareCollection" as const },
          { label: "Показывать достижения", desc: "Друзья могут видеть ваши бейджи", key: "shareAchievements" as const },
          { label: "Показывать список желаний", desc: "Друзья могут видеть что вы хотите", key: "shareWishlist" as const },
        ].map((item) => {
          const enabled = privacy?.[item.key] ?? true;
          return (
            <button
              key={item.label}
              onClick={() => togglePrivacy(item.key)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-greenhouse/20"
            >
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
              <div className={cn("h-5 w-9 rounded-full p-0.5 transition-colors", enabled ? "bg-leaf/20" : "bg-muted")}>
                <div className={cn("h-4 w-4 rounded-full transition-all", enabled ? "translate-x-4 bg-leaf" : "translate-x-0 bg-muted-foreground/40")} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

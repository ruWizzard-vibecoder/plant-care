"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { BOTTOM_NAV_TABS as tabs } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const { data: pendingCount } = trpc.friends.pendingCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom lg:hidden"
      style={{ boxShadow: "var(--shadow-nav)" }}
    >
      {/* Glass background */}
      <div className="glass border-t border-dew/60">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
          {tabs.map(({ href, icon: Icon, label, isFab, badgeKey }) => {
            const isActive = pathname.startsWith(href);
            const showBadge = badgeKey === "friends" && (pendingCount ?? 0) > 0;

            if (isFab) {
              return (
                <Link
                  key={href}
                  href={href}
                  className="fab-press relative -mt-8 flex items-center justify-center"
                  aria-label="Сканер растений"
                >
                  {/* Diamond shape */}
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl rotate-45",
                      "bg-gradient-to-br from-leaf to-leaf-light",
                      "transition-all duration-300 ease-out"
                    )}
                    style={{ boxShadow: "var(--shadow-fab)" }}
                  >
                    <Icon
                      size={22}
                      className="-rotate-45 text-white"
                      strokeWidth={2.2}
                    />
                  </div>
                  {/* Subtle ring */}
                  <div className="absolute inset-0 -m-1 rounded-2xl rotate-45 border-2 border-leaf/10" />
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex flex-col items-center gap-0.5 px-3 py-1.5",
                  "transition-colors duration-200",
                  isActive
                    ? "text-leaf"
                    : "text-foreground-secondary/50"
                )}
              >
                <div className="relative">
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className="transition-all duration-200"
                  />
                  {/* Active indicator dot */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-leaf animate-scale-in" />
                  )}
                  {/* Badge dot for pending requests */}
                  {showBadge && (
                    <div className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-surface" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-tight tracking-wide transition-all duration-200",
                    isActive ? "font-semibold" : "font-medium opacity-70"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

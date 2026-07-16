"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { SIDEBAR_NAV } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const { data: pendingCount } = trpc.friends.pendingCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-dew/60 bg-surface/80 backdrop-blur-sm lg:flex">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 pt-8">
        <div className="flex h-9 w-9 rotate-45 items-center justify-center rounded-xl bg-gradient-to-br from-leaf to-leaf-light">
          <Leaf size={16} className="-rotate-45 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight">Plant Care</span>
      </Link>

      {/* Scanner CTA (desktop replacement for the mobile FAB) */}
      <div className="px-4 pt-6">
        <Link
          href="/scanner"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-leaf to-leaf-light px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ boxShadow: "var(--shadow-fab)" }}
        >
          <ScanLine size={18} />
          Сканировать
        </Link>
      </div>

      {/* Nav list */}
      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {SIDEBAR_NAV.map(({ href, icon: Icon, label, badgeKey }) => {
          const isActive = pathname.startsWith(href);
          const showBadge = badgeKey === "friends" && (pendingCount ?? 0) > 0;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-leaf/10 font-semibold text-leaf"
                  : "text-foreground-secondary hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

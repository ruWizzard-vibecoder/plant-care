import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Desktop sidebar (hidden below lg) */}
      <Sidebar />

      {/* Main content with bottom padding for nav; left padding for sidebar on desktop */}
      <main className="flex-1 pb-20 lg:pb-8 lg:pl-64">{children}</main>

      {/* Bottom navigation (hidden on lg) */}
      <BottomNav />
    </div>
  );
}

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-greenhouse to-dew">
        <WifiOff size={40} className="text-stem" />
      </div>

      <h1 className="mt-6 text-xl font-bold tracking-tight">Нет подключения</h1>
      <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
        Проверьте подключение к интернету и попробуйте снова
      </p>

      <a
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-leaf px-6 py-3 text-sm font-semibold text-white transition-all active:scale-95"
        style={{ boxShadow: "0 2px 10px rgba(27,94,32,0.25)" }}
      >
        <RefreshCw size={16} />
        Обновить
      </a>
    </div>
  );
}

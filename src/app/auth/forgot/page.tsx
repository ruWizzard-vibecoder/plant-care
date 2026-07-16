"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Mail, Loader2, ArrowRight, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/auth/reset-password" });
      // Always show success — don't reveal whether the email exists.
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <div className="animate-scale-in flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-leaf to-leaf-light shadow-lg">
            <MailCheck size={28} className="text-white" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Проверьте почту</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Если аккаунт с таким email существует, мы отправили на него ссылку для сброса пароля.
          </p>
          <Link href="/auth/login" className="mt-6 text-sm font-semibold text-leaf hover:underline">
            Вернуться ко входу
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="animate-scale-in flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl rotate-45 bg-gradient-to-br from-leaf to-leaf-light shadow-lg">
          <Mail size={28} className="-rotate-45 text-white" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Восстановление пароля</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Введите email — пришлём ссылку для сброса пароля
        </p>
      </div>

      <form onSubmit={handleSubmit} className="animate-fade-up mt-8 w-full max-w-sm space-y-4" style={{ animationDelay: "100ms" }}>
        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className={cn(
              "w-full rounded-2xl border border-border bg-surface py-3 pl-10 pr-4",
              "text-sm focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
            )}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-2xl py-3.5",
            "bg-gradient-to-r from-leaf to-leaf-light text-white text-sm font-bold tracking-wide",
            "transition-all duration-200 active:scale-[0.98] disabled:opacity-60"
          )}
          style={{ boxShadow: "var(--shadow-fab)" }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <>Отправить ссылку <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="animate-fade-up mt-6 text-sm text-muted-foreground" style={{ animationDelay: "200ms" }}>
        <Link href="/auth/login" className="font-semibold text-leaf hover:underline">
          Вернуться ко входу
        </Link>
      </p>
    </div>
  );
}

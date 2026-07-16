"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Leaf, Lock, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const invalidLink = !token || params.get("error") === "INVALID_TOKEN";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
      if (resetError) {
        setError("Ссылка недействительна или устарела. Запросите сброс заново.");
        return;
      }
      router.push("/auth/login?reset=success");
    } catch {
      setError("Не удалось сменить пароль. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  if (invalidLink) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-bold">Ссылка недействительна</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Ссылка для сброса пароля устарела или неверна.
        </p>
        <Link href="/auth/forgot" className="mt-6 text-sm font-semibold text-leaf hover:underline">
          Запросить новую ссылку
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="animate-scale-in flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl rotate-45 bg-gradient-to-br from-leaf to-leaf-light shadow-lg">
          <Lock size={28} className="-rotate-45 text-white" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Новый пароль</h1>
        <p className="mt-1 text-sm text-muted-foreground">Задайте новый пароль для входа</p>
      </div>

      <form onSubmit={handleSubmit} className="animate-fade-up mt-8 w-full max-w-sm space-y-4" style={{ animationDelay: "100ms" }}>
        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Новый пароль (минимум 8 символов)"
            required
            minLength={8}
            className={cn(
              "w-full rounded-2xl border border-border bg-surface py-3 pl-10 pr-4",
              "text-sm focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
            )}
          />
        </div>

        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Повторите пароль"
            required
            minLength={8}
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
          {loading ? <Loader2 size={18} className="animate-spin" /> : <>Сменить пароль <ArrowRight size={16} /></>}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><Leaf className="animate-pulse text-leaf" /></div>}>
      <ResetInner />
    </Suspense>
  );
}

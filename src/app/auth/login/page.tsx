"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Leaf, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice] = useState(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reset") === "success"
      ? "Пароль изменён. Войдите с новым паролем."
      : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await signIn.email({ email, password });
      if (signInError) {
        if (signInError.code === "EMAIL_NOT_VERIFIED" || signInError.status === 403) {
          setError("Email не подтверждён. Проверьте почту — мы отправили ссылку для подтверждения.");
        } else {
          setError("Неверный email или пароль");
        }
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="animate-scale-in flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl rotate-45 bg-gradient-to-br from-leaf to-leaf-light shadow-lg">
          <Leaf size={28} className="-rotate-45 text-white" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">
          Plant Care
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Войдите, чтобы продолжить
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="animate-fade-up mt-8 w-full max-w-sm space-y-4"
        style={{ animationDelay: "100ms" }}
      >
        {notice && (
          <div className="rounded-xl bg-leaf/10 px-4 py-3 text-sm text-leaf">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

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

        <div className="relative">
          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
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
            "bg-gradient-to-r from-leaf to-leaf-light text-white",
            "text-sm font-bold tracking-wide",
            "transition-all duration-200 active:scale-[0.98]",
            "disabled:opacity-60"
          )}
          style={{ boxShadow: "var(--shadow-fab)" }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              Войти
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <p className="text-center">
          <Link href="/auth/forgot" className="text-xs font-medium text-muted-foreground hover:text-leaf hover:underline">
            Забыли пароль?
          </Link>
        </p>
      </form>

      {/* Register link */}
      <p className="animate-fade-up mt-6 text-sm text-muted-foreground" style={{ animationDelay: "200ms" }}>
        Нет аккаунта?{" "}
        <Link href="/auth/register" className="font-semibold text-leaf hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}

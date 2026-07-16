"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp, authClient } from "@/lib/auth-client";
import { Leaf, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: signUpError } = await signUp.email({ name, email, password });
      if (signUpError) {
        setError("Ошибка регистрации. Попробуйте другой email.");
        return;
      }
      // With email verification on, sign-up does not create a session — send the
      // user to the "check your inbox" screen. Otherwise go straight to the app.
      const { data: session } = await authClient.getSession();
      if (session) {
        router.push("/dashboard");
      } else {
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
      }
    } catch {
      setError("Ошибка регистрации. Попробуйте другой email.");
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
          Создать аккаунт
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Начните заботиться о растениях
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="animate-fade-up mt-8 w-full max-w-sm space-y-4"
        style={{ animationDelay: "100ms" }}
      >
        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="relative">
          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя"
            required
            className={cn(
              "w-full rounded-2xl border border-border bg-surface py-3 pl-10 pr-4",
              "text-sm focus:border-leaf/40 focus:outline-none focus:ring-2 focus:ring-leaf/10"
            )}
          />
        </div>

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
            placeholder="Пароль (минимум 8 символов)"
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
              Зарегистрироваться
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Login link */}
      <p className="animate-fade-up mt-6 text-sm text-muted-foreground" style={{ animationDelay: "200ms" }}>
        Уже есть аккаунт?{" "}
        <Link href="/auth/login" className="font-semibold text-leaf hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}

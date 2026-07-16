"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Leaf, MailCheck, Loader2 } from "lucide-react";

function VerifyInner() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resend = async () => {
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
      setSent(true);
    } catch {
      setError("Не удалось отправить письмо. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="animate-scale-in flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-leaf to-leaf-light shadow-lg">
          <MailCheck size={28} className="text-white" />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight">Проверьте почту</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Мы отправили письмо с подтверждением{email ? " на " : ""}
          {email && <span className="font-semibold text-foreground">{email}</span>}.
          Перейдите по ссылке из письма, чтобы активировать аккаунт.
        </p>
      </div>

      <div className="animate-fade-up mt-8 w-full max-w-sm space-y-3" style={{ animationDelay: "100ms" }}>
        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        {sent && <div className="rounded-xl bg-leaf/10 px-4 py-3 text-sm text-leaf">Письмо отправлено повторно.</div>}

        <button
          onClick={resend}
          disabled={loading || !email}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Отправить письмо ещё раз"}
        </button>

        <p className="text-sm text-muted-foreground">
          <Link href="/auth/login" className="font-semibold text-leaf hover:underline">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><Leaf className="animate-pulse text-leaf" /></div>}>
      <VerifyInner />
    </Suspense>
  );
}

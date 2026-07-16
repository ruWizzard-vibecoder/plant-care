import Link from "next/link";
import {
  Leaf,
  ScanLine,
  Bell,
  BarChart3,
  Sparkles,
  ArrowRight,
  TreePine,
  Droplets,
} from "lucide-react";

const FEATURES = [
  {
    icon: ScanLine,
    title: "Сканер растений",
    description: "Наведите камеру — мы определим растение и расскажем, как за ним ухаживать.",
  },
  {
    icon: Droplets,
    title: "Умные напоминания",
    description: "Календарь полива, подкормки и пересадки — никогда не забудете о заботе.",
  },
  {
    icon: Sparkles,
    title: "AI-советник",
    description: "Персональные советы по уходу на основе искусственного интеллекта.",
  },
  {
    icon: BarChart3,
    title: "Отслеживание роста",
    description: "Фиксируйте рост, состояние и историю ухода за каждым растением.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-hidden">
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl rotate-45 bg-gradient-to-br from-leaf to-leaf-light">
            <Leaf size={16} className="-rotate-45 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Plant Care</span>
        </div>
        <Link
          href="/auth/login"
          className="rounded-full bg-leaf px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-leaf-light"
        >
          Войти
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 md:flex md:items-center md:gap-12 md:pt-28">
        <div className="flex-1">
          <h1
            className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Сохраняйте природу{" "}
            <span className="text-leaf">зелёной</span> для будущего.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-foreground-secondary md:text-lg">
            Объединяем заботу об окружающей среде с умными технологиями через
            мощные кампании и сообщество единомышленников.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-leaf px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-leaf-light active:scale-[0.98]"
            >
              Начать бесплатно
              <ArrowRight size={16} />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Узнать больше
            </Link>
          </div>
        </div>

        {/* Hero illustration */}
        <div className="mt-12 flex flex-1 justify-center md:mt-0">
          <div className="relative h-80 w-64 md:h-96 md:w-80">
            {/* Phone mockup */}
            <div className="absolute inset-0 rounded-[2.5rem] border-2 border-border/30 bg-surface p-3 shadow-2xl">
              <div className="h-full rounded-[2rem] bg-gradient-to-b from-morning to-greenhouse p-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-leaf" />
                  <div className="h-1.5 w-16 rounded-full bg-leaf/20" />
                </div>
                <div className="mt-8 flex flex-col items-center">
                  <svg
                    viewBox="0 0 100 130"
                    className="h-32 w-24 text-leaf/30"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="0.5"
                  >
                    <path d="M50 130V50" fill="none" strokeWidth="2" />
                    <ellipse cx="50" cy="75" rx="25" ry="8" opacity="0.1" />
                    <path d="M50 50C50 50 20 38 12 14C4 -10 24 -12 40 8C56 28 50 50 50 50Z" opacity="0.4" />
                    <path d="M50 65C50 65 80 53 88 29C96 5 76 3 60 23C44 43 50 65 50 65Z" opacity="0.3" />
                    <path d="M50 80C50 80 28 72 22 52C16 32 32 30 42 44C52 58 50 80 50 80Z" opacity="0.25" />
                  </svg>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2 w-3/4 rounded-full bg-leaf/15" />
                  <div className="h-2 w-1/2 rounded-full bg-leaf/10" />
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <div className="absolute -left-8 top-12 rounded-2xl bg-surface p-3 shadow-lg border border-border/30 animate-[fadeSlideUp_0.8s_ease_0.4s_both]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                  <Droplets size={14} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold">Полив</p>
                  <p className="text-[9px] text-muted-foreground">3 растения</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-6 bottom-24 rounded-2xl bg-surface p-3 shadow-lg border border-border/30 animate-[fadeSlideUp_0.8s_ease_0.6s_both]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50">
                  <TreePine size={14} className="text-leaf" />
                </div>
                <div>
                  <p className="text-[10px] font-bold">+12%</p>
                  <p className="text-[9px] text-muted-foreground">Рост</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-5xl px-6 py-16">
        <h2
          className="text-center text-3xl font-bold tracking-tight md:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Выращивайте <span className="text-leaf">умно</span>
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-foreground-secondary md:text-base">
          Сочетая экологичные практики с умными технологиями, мы меняем подход к
          заботе о растениях.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl border border-border/40 bg-surface p-6 transition-all hover:border-leaf/20 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-leaf/10 transition-colors group-hover:bg-leaf/15">
                <feature.icon size={20} className="text-leaf" />
              </div>
              <h3 className="mt-4 text-base font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf size={14} className="text-leaf" />
            Plant Care &copy; {new Date().getFullYear()}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-leaf transition-colors">Конфиденциальность</a>
            <a href="#" className="hover:text-leaf transition-colors">Условия</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

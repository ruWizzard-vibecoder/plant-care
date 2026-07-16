"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserPlus,
  Check,
  X,
  Trash2,
  Loader2,
  Leaf,
  Trophy,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { ALL_ACHIEVEMENTS } from "@/server/lib/achievements";

type Tab = "friends" | "requests" | "feed";

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>("friends");
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");

  const utils = trpc.useUtils();
  const { data: friends, isLoading: friendsLoading } = trpc.friends.list.useQuery();
  const { data: requests } = trpc.friends.pendingRequests.useQuery();
  const { data: pendingCount } = trpc.friends.pendingCount.useQuery();
  const { data: feed } = trpc.friends.activityFeed.useQuery();

  const sendRequest = trpc.friends.sendRequest.useMutation({
    onSuccess: () => {
      setEmail("");
      setShowAdd(false);
    },
  });

  const respond = trpc.friends.respond.useMutation({
    onSuccess: () => {
      utils.friends.pendingRequests.invalidate();
      utils.friends.pendingCount.invalidate();
      utils.friends.list.invalidate();
    },
  });

  const removeFriend = trpc.friends.remove.useMutation({
    onSuccess: () => utils.friends.list.invalidate(),
  });

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "friends", label: "Друзья" },
    { key: "requests", label: "Заявки", badge: pendingCount ?? 0 },
    { key: "feed", label: "Лента" },
  ];

  return (
    <div className="mx-auto max-w-md lg:max-w-3xl xl:max-w-4xl">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between px-4 pt-12">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border/50 transition-colors hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <h2 className="text-base font-semibold">Друзья</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf/10 text-leaf transition-colors hover:bg-leaf/20"
        >
          <UserPlus size={18} />
        </button>
      </div>

      {/* Add friend modal */}
      {showAdd && (
        <div className="mx-4 mt-3 animate-fade-up rounded-2xl bg-surface border border-leaf/20 p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-sm font-semibold mb-2">Добавить друга</p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email друга"
              className="flex-1 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none focus:border-leaf/50 focus:ring-1 focus:ring-leaf/20"
            />
            <button
              onClick={() => sendRequest.mutate({ email })}
              disabled={!email || sendRequest.isPending}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-leaf text-white transition-all hover:bg-leaf-light disabled:opacity-40 active:scale-95"
            >
              {sendRequest.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          {sendRequest.error && (
            <p className="mt-2 text-xs text-red-500">{sendRequest.error.message}</p>
          )}
          {sendRequest.isSuccess && (
            <p className="mt-2 text-xs text-leaf">Заявка отправлена!</p>
          )}
          <button onClick={() => setShowAdd(false)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">
            Отмена
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-4 mt-4 flex gap-1 rounded-xl bg-muted/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
              tab === t.key ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {t.label}
            {(t.badge ?? 0) > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 mt-4 pb-6">
        {tab === "friends" && (
          <FriendsTab
            friends={friends ?? []}
            isLoading={friendsLoading}
            onRemove={(id) => removeFriend.mutate({ friendshipId: id })}
            removing={removeFriend.isPending}
          />
        )}
        {tab === "requests" && (
          <RequestsTab
            requests={requests ?? []}
            onRespond={(id, action) => respond.mutate({ friendshipId: id, action })}
            responding={respond.isPending}
          />
        )}
        {tab === "feed" && <FeedTab feed={feed ?? []} />}
      </div>
    </div>
  );
}

function FriendsTab({
  friends,
  isLoading,
  onRemove,
  removing,
}: {
  friends: { friendshipId: string; id: string; name: string; email: string; image: string | null; plantCount: number; achievementCount: number }[];
  isLoading: boolean;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <UserPlus size={24} className="text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm font-semibold">Пока нет друзей</p>
        <p className="mt-1 text-xs text-muted-foreground text-center">
          Добавьте друзей по email, чтобы<br />видеть их коллекции и сравнивать рост
        </p>
      </div>
    );
  }

  return (
    <div className="stagger space-y-2">
      {friends.map((friend, i) => (
        <div
          key={friend.friendshipId}
          className="animate-fade-up flex items-center gap-3 rounded-2xl bg-surface border border-border/30 p-3.5"
          style={{ animationDelay: `${i * 50}ms`, boxShadow: "var(--shadow-card)" }}
        >
          <Link href={`/friends/${friend.id}`} className="flex flex-1 items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-greenhouse to-dew">
              {friend.image ? (
                <img src={friend.image} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-stem">{friend.name[0]}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{friend.name}</p>
              <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Leaf size={10} className="text-leaf" />
                  {friend.plantCount}
                </span>
                <span className="flex items-center gap-0.5">
                  <Trophy size={10} className="text-amber-500" />
                  {friend.achievementCount}
                </span>
              </div>
            </div>
          </Link>
          <button
            onClick={() => onRemove(friend.friendshipId)}
            disabled={removing}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function RequestsTab({
  requests,
  onRespond,
  responding,
}: {
  requests: { friendshipId: string; from: { id: string; name: string; email: string; image: string | null }; createdAt: string }[];
  onRespond: (id: string, action: "accept" | "reject") => void;
  responding: boolean;
}) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <p className="text-sm text-muted-foreground">Нет входящих заявок</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => (
        <div
          key={req.friendshipId}
          className="animate-fade-up flex items-center gap-3 rounded-2xl bg-surface border border-border/30 p-3.5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-greenhouse to-dew">
            <span className="text-base font-bold text-stem">{req.from.name[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{req.from.name}</p>
            <p className="text-[10px] text-muted-foreground">{req.from.email}</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => onRespond(req.friendshipId, "accept")}
              disabled={responding}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-leaf/10 text-leaf transition-colors hover:bg-leaf/20"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => onRespond(req.friendshipId, "reject")}
              disabled={responding}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 transition-colors hover:bg-red-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedTab({ feed }: { feed: { type: string; date: string; userId: string; userName: string; detail: string }[] }) {
  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <p className="text-sm text-muted-foreground">Нет событий</p>
        <p className="mt-1 text-xs text-muted-foreground text-center">
          Добавьте друзей, чтобы видеть<br />их активность
        </p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "plant": return "🌱";
      case "achievement": return "🏆";
      case "propagation": return "✂️";
      default: return "📌";
    }
  };

  const getAction = (type: string, detail: string) => {
    switch (type) {
      case "plant": return `добавил(а) растение: ${detail}`;
      case "achievement": {
        const ach = ALL_ACHIEVEMENTS.find((a) => a.type === detail);
        return `получил(а) достижение: ${ach ? `${ach.icon} ${ach.label}` : detail}`;
      }
      case "propagation": return `начал(а) размножение: ${detail}`;
      default: return detail;
    }
  };

  return (
    <div className="space-y-2">
      {feed.map((item, i) => (
        <Link
          key={i}
          href={`/friends/${item.userId}`}
          className="animate-fade-up flex gap-3 rounded-2xl bg-surface border border-border/30 p-3.5 transition-colors hover:bg-muted/30"
          style={{ animationDelay: `${i * 40}ms`, boxShadow: "var(--shadow-card)" }}
        >
          <span className="text-lg">{getIcon(item.type)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-relaxed">
              <span className="font-semibold">{item.userName}</span>{" "}
              {getAction(item.type, item.detail)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {new Date(item.date).toLocaleDateString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

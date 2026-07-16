"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";

interface WishlistButtonProps {
  speciesId: string;
  variant?: "icon" | "full";
  className?: string;
}

export function WishlistButton({ speciesId, variant = "icon", className }: WishlistButtonProps) {
  const utils = trpc.useUtils();
  const { data: isInWishlist, isLoading } = trpc.wishlist.isInWishlist.useQuery(
    { speciesId },
    { staleTime: 30_000 }
  );

  const toggle = trpc.wishlist.toggle.useMutation({
    onMutate: async () => {
      await utils.wishlist.isInWishlist.cancel({ speciesId });
      const prev = utils.wishlist.isInWishlist.getData({ speciesId });
      if (prev !== undefined) {
        utils.wishlist.isInWishlist.setData({ speciesId }, !prev);
      }
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev !== undefined) {
        utils.wishlist.isInWishlist.setData({ speciesId }, context.prev);
      }
    },
    onSettled: () => {
      utils.wishlist.isInWishlist.invalidate({ speciesId });
      utils.wishlist.count.invalidate();
      utils.wishlist.list.invalidate();
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) toggle.mutate({ speciesId });
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-all active:scale-90",
          isInWishlist
            ? "bg-rose-500/90 text-white"
            : "bg-white/80 text-muted-foreground hover:text-rose-500",
          className
        )}
      >
        <Heart size={13} fill={isInWishlist ? "currentColor" : "none"} strokeWidth={2.2} />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all active:scale-[0.98]",
        isInWishlist
          ? "border border-rose-300 bg-rose-50 text-rose-600"
          : "border border-border/50 bg-surface text-muted-foreground hover:border-rose-200 hover:text-rose-500",
        className
      )}
    >
      <Heart size={16} fill={isInWishlist ? "currentColor" : "none"} />
      {isInWishlist ? "В списке желаний" : "В список желаний"}
    </button>
  );
}

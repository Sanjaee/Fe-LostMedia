"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import {
  ThumbsUp,
  Heart,
  Smile,
  Meh,
  Frown,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Like } from "@/types/like";

/** Delay before sending unlike to server (reduce hit if user re-likes quickly) */
const UNLIKE_DEBOUNCE_MS = 2000;

interface LikeButtonProps {
  targetType: "post" | "comment";
  targetID: string;
  initialLikeCount?: number;
  initialUserLike?: Like | null;
  onLikeChange?: (liked: boolean, likeCount: number) => void;
  compact?: boolean;
  /** Reaksi yang dipakai saat klik sekali (mis. "love" untuk reels = heart merah) */
  defaultReaction?: "like" | "love" | "haha" | "wow" | "sad" | "angry";
  /** Warna ikon saat belum like (mis. "text-white" untuk overlay gelap) */
  unlikedClassName?: string;
  /** Sembunyikan picker reaksi, hanya satu reaksi (defaultReaction) */
  singleReaction?: boolean;
  /** Class ukuran ikon saat compact (mis. "h-8 w-8" untuk reels) */
  compactIconClassName?: string;
  /** Saat like, ikon (Heart) ditampilkan filled (full bg) */
  iconFilledWhenLiked?: boolean;
  /** Class tambahan untuk tombol compact (mis. h-12 w-12 agar sama dengan tombol lain) */
  compactButtonClassName?: string;
}

const REACTIONS = [
  { type: "like" as const, icon: ThumbsUp, label: "Like", color: "text-blue-500" },
  { type: "love" as const, icon: Heart, label: "Love", color: "text-red-500" },
  { type: "haha" as const, icon: Smile, label: "Haha", color: "text-yellow-500" },
  { type: "wow" as const, icon: Meh, label: "Wow", color: "text-yellow-500" },
  { type: "sad" as const, icon: Frown, label: "Sad", color: "text-yellow-500" },
  { type: "angry" as const, icon: AlertCircle, label: "Angry", color: "text-red-500" },
];

export const LikeButton: React.FC<LikeButtonProps> = ({
  targetType,
  targetID,
  initialLikeCount = 0,
  initialUserLike = null,
  onLikeChange,
  compact = false,
  defaultReaction = "like",
  unlikedClassName,
  singleReaction = false,
  compactIconClassName,
  iconFilledWhenLiked = false,
  compactButtonClassName,
}) => {
  const { api } = useApi();
  const { toast } = useToast();
  const [liked, setLiked] = useState(!!initialUserLike);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [currentReaction, setCurrentReaction] = useState<
    "like" | "love" | "haha" | "wow" | "sad" | "angry" | null
  >(initialUserLike?.reaction || null);
  const [loading, setLoading] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const unlikeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLiked(!!initialUserLike);
    setCurrentReaction(initialUserLike?.reaction || null);
  }, [initialUserLike]);

  useEffect(() => {
    setLikeCount(initialLikeCount);
  }, [initialLikeCount]);

  // Clear pending unlike on unmount or when target changes
  useEffect(() => {
    return () => {
      if (unlikeTimeoutRef.current) {
        clearTimeout(unlikeTimeoutRef.current);
        unlikeTimeoutRef.current = null;
      }
    };
  }, [targetID]);

  const flushPendingUnlike = () => {
    if (unlikeTimeoutRef.current) {
      clearTimeout(unlikeTimeoutRef.current);
      unlikeTimeoutRef.current = null;
    }
  };

  const handleLike = async (reaction: "like" | "love" | "haha" | "wow" | "sad" | "angry" = "like") => {
    if (loading) return;

    // Same reaction click = unlike. Treat null (from API user_liked) as "like" so 2nd click unlikes
    const effectiveCurrent = currentReaction ?? (liked ? "like" : null);
    const isSameReactionClick = liked && effectiveCurrent === reaction;

    if (isSameReactionClick) {
      // Unlike: optimistic UI immediately, debounce API to reduce server hit
      flushPendingUnlike();
      setLiked(false);
      setCurrentReaction(null);
      const newCount = Math.max(0, likeCount - 1);
      setLikeCount(newCount);
      onLikeChange?.(false, newCount);

      unlikeTimeoutRef.current = setTimeout(async () => {
        unlikeTimeoutRef.current = null;
        try {
          if (targetType === "post") {
            await api.unlikePost(targetID);
          } else {
            await api.unlikeComment(targetID);
          }
        } catch (error: any) {
          toast({
            title: "Error",
            description: error.message || "Gagal menghapus like",
            variant: "destructive",
          });
          // Rollback UI on error
          setLiked(true);
          setCurrentReaction(reaction);
          setLikeCount(likeCount);
          onLikeChange?.(true, likeCount);
        }
      }, UNLIKE_DEBOUNCE_MS);
      return;
    }

    // Like or change reaction: cancel any pending unlike, then call API
    flushPendingUnlike();
    setLoading(true);
    try {
      if (targetType === "post") {
        await api.likePost(targetID, { reaction });
      } else {
        await api.likeComment(targetID, { reaction });
      }
      setLiked(true);
      setCurrentReaction(reaction);
      const newCount = liked ? likeCount : likeCount + 1;
      setLikeCount(newCount);
      onLikeChange?.(true, newCount);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update like",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // When liked but no reaction type (e.g. from API user_liked), show default "like" (blue)
  const effectiveReaction = currentReaction || (liked ? "like" : null);
  // Reels: selalu pakai Heart, bukan ThumbsUp
  const ReactionIcon =
    singleReaction && defaultReaction === "love"
      ? Heart
      : effectiveReaction
        ? REACTIONS.find((r) => r.type === effectiveReaction)?.icon || ThumbsUp
        : ThumbsUp;

  const reactionColor = effectiveReaction
    ? REACTIONS.find((r) => r.type === effectiveReaction)?.color || "text-blue-500"
    : "text-gray-600 dark:text-gray-400";

  const unlikedClass = unlikedClassName ?? "text-zinc-600 dark:text-zinc-400";

  if (compact) {
    return (
      <div 
        className="relative"
        onMouseEnter={() => !singleReaction && setShowReactions(true)}
        onMouseLeave={() => !singleReaction && setShowReactions(false)}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleLike(defaultReaction)}
          disabled={loading}
          className={`h-8 px-2 flex items-center justify-center ${liked ? reactionColor : unlikedClass} ${compactButtonClassName ?? ""}`}
        >
          {loading ? (
            <Skeleton className={`shrink-0 ${compactIconClassName || "h-4 w-4"}`} />
          ) : (
            <ReactionIcon
              className={`shrink-0 ${compactIconClassName || "h-4 w-4"} ${liked && iconFilledWhenLiked ? "fill-current" : ""}`}
              {...(liked && iconFilledWhenLiked ? { fill: "currentColor" } : {})}
            />
          )}
        </Button>

        {!singleReaction && showReactions && (
          <div
            className="absolute bottom-full left-0 mb-2 flex gap-1 bg-white dark:bg-zinc-800 rounded-full shadow-lg p-1 border border-zinc-200 dark:border-zinc-700 z-10"
          >
            {REACTIONS.map((reaction) => {
              const Icon = reaction.icon;
              const isSelected = currentReaction === reaction.type;
              return (
                <button
                  key={reaction.type}
                  onClick={() => handleLike(reaction.type)}
                  className={`p-2 rounded-full transition-colors ${
                    isSelected 
                      ? "bg-zinc-100 dark:bg-zinc-700" 
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                  title={reaction.label}
                >
                  <Icon className={`h-5 w-5 ${reaction.color}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleLike("like")}
        disabled={loading}
        className={`h-9 px-3 ${liked ? reactionColor : "text-gray-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
      >
        {loading ? (
          <Skeleton className="h-4 w-4 mr-2 shrink-0" />
        ) : (
          <ReactionIcon className={`h-4 w-4 mr-2 ${liked ? reactionColor : ""}`} />
        )}
        <span>Suka</span>
      </Button>

      {showReactions && (
        <div
          className="absolute bottom-full left-0 mb-2 flex gap-1 bg-white dark:bg-zinc-800 rounded-full shadow-lg p-1 border border-zinc-200 dark:border-zinc-700 z-10"
        >
          {REACTIONS.map((reaction) => {
            const Icon = reaction.icon;
            const isSelected = currentReaction === reaction.type;
            return (
              <button
                key={reaction.type}
                onClick={() => handleLike(reaction.type)}
                className={`p-2 rounded-full transition-colors ${
                  isSelected 
                    ? "bg-zinc-100 dark:bg-zinc-700" 
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                }`}
                title={reaction.label}
              >
                <Icon className={`h-6 w-6 ${reaction.color}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

"use client";

import React, { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import type { Like } from "@/types/like";

interface LikeButtonProps {
  targetType: "post" | "comment";
  targetID: string;
  initialLikeCount?: number;
  initialUserLike?: Like | null;
  onLikeChange?: (liked: boolean, likeCount: number) => void;
  compact?: boolean;
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

  useEffect(() => {
    setLiked(!!initialUserLike);
    setCurrentReaction(initialUserLike?.reaction || null);
  }, [initialUserLike]);

  useEffect(() => {
    setLikeCount(initialLikeCount);
  }, [initialLikeCount]);

  const handleLike = async (reaction: "like" | "love" | "haha" | "wow" | "sad" | "angry" = "like") => {
    if (loading) return;

    setLoading(true);
    try {
      if (liked && currentReaction === reaction) {
        // Unlike
        if (targetType === "post") {
          await api.unlikePost(targetID);
        } else {
          await api.unlikeComment(targetID);
        }
        setLiked(false);
        setCurrentReaction(null);
        const newCount = Math.max(0, likeCount - 1);
        setLikeCount(newCount);
        onLikeChange?.(false, newCount);
      } else {
        // Like or change reaction
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
      }
      // Keep reactions visible after selection - only hide on mouse leave
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

  const ReactionIcon = currentReaction
    ? REACTIONS.find((r) => r.type === currentReaction)?.icon || ThumbsUp
    : ThumbsUp;

  const reactionColor = currentReaction
    ? REACTIONS.find((r) => r.type === currentReaction)?.color || "text-blue-500"
    : "text-gray-600 dark:text-gray-400";

  if (compact) {
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
          className={`h-8 px-2 ${liked ? reactionColor : "text-zinc-600 dark:text-zinc-400"}`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ReactionIcon className="h-4 w-4" />
          )}
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
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

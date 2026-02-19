"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { CommentInput } from "./CommentInput";
import { CommentList } from "./CommentList";
import type { Post } from "@/types/post";

interface ReelsCommentSidebarProps {
  post: Post | null;
  isOpen?: boolean;
  variant?: "sidebar" | "bottomsheet";
  onClose?: () => void;
  onCommentCountChange?: (count: number) => void;
  refreshTrigger?: number;
}

export const ReelsCommentSidebar: React.FC<ReelsCommentSidebarProps> = ({
  post,
  isOpen = false,
  variant = "sidebar",
  onClose,
  onCommentCountChange,
  refreshTrigger = 0,
}) => {
  const [commentAddedTrigger, setCommentAddedTrigger] = useState(0);
  const effectiveRefresh = refreshTrigger + commentAddedTrigger;

  const handleCommentAdded = () => {
    setCommentAddedTrigger((t) => t + 1);
  };

  if (!post) return null;

  const isBottomsheet = variant === "bottomsheet";

  return (
    <div
      className={`flex h-full flex-col bg-white dark:bg-zinc-950 ${
        isBottomsheet
          ? "max-h-[85vh] w-full rounded-t-xl border-t border-zinc-200 dark:border-zinc-800"
          : "max-h-dvh w-full max-w-[380px] border-l border-zinc-200 dark:border-zinc-800 md:max-w-[420px]"
      }`}
    >
      {/* Header - sama seperti PhotoModal */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Komentar Terbaru</h3>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Daftar komentar - pakai CommentList seperti feed-client & PhotoModal, hanya saat panel terbuka */}
      <div className="scrollbar-hide flex-1 overflow-y-auto px-4 py-3">
        {isOpen && (
          <div className="space-y-4">
            <CommentList
              postID={post.id}
              refreshTrigger={effectiveRefresh}
              onCommentCountChange={onCommentCountChange}
            />
          </div>
        )}
      </div>

      {/* Footer input - style seperti PhotoModal */}
      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3">
        <CommentInput
          postID={post.id}
          placeholder="Tulis komentar..."
          onCommentAdded={handleCommentAdded}
          compact
        />
      </div>
    </div>
  );
};

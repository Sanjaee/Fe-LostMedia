"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { CommentInput } from "./CommentInput";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Heart, MessageCircle } from "lucide-react";
import { useApi } from "@/components/contex/ApiProvider";
import type { Comment } from "@/types/comment";
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
  const { api } = useApi();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const onCommentCountChangeRef = useRef(onCommentCountChange);
  onCommentCountChangeRef.current = onCommentCountChange;

  const loadComments = useCallback(async () => {
    if (!post?.id) return;
    try {
      setLoading(true);
      const response = await api.getCommentsByPostID(post.id, 50, 0);
      const list = response.comments || response.data?.comments || [];
      const total = response.total ?? response.data?.total ?? list.length;
      setComments(list);
      onCommentCountChangeRef.current?.(total);
    } catch (e) {
      console.error("Reels comments load error:", e);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [post?.id, api]);

  useEffect(() => {
    if (post?.id && isOpen) loadComments();
    else if (!post?.id) setComments([]);
  }, [post?.id, isOpen, loadComments, refreshTrigger]);

  const handleCommentAdded = useCallback(() => {
    if (post?.id) loadComments();
  }, [post?.id, loadComments]);

  if (!post) return null;

  const count = comments.length;

  const isBottomsheet = variant === "bottomsheet";

  return (
    <div
      className={`flex h-full flex-col bg-zinc-950 ${
        isBottomsheet
          ? "max-h-[85vh] w-full rounded-t-xl border-t border-zinc-800"
          : "max-h-[100dvh] w-full max-w-[380px] border-l border-zinc-800 md:max-w-[420px]"
      }`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h3 className="font-semibold text-white">Komentar {count}</h3>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Scrollable comment list */}
      <div className="scrollbar-hide flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <p className="text-zinc-400 text-sm mt-3">Memuat komentar...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-zinc-600 mb-3" />
            <p className="text-zinc-400 text-sm">Belum ada komentar</p>
            <p className="text-zinc-500 text-xs mt-1">Jadilah yang pertama berkomentar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.user?.profile_photo} alt="" />
                  <AvatarFallback className="bg-violet-600 text-white text-xs">
                    {(comment.user?.full_name || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-white truncate">
                      {comment.user?.username || comment.user?.full_name || "User"}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 mt-0.5 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      <Heart className="h-3.5 w-3.5" />
                      {comment.like_count ?? 0}
                    </button>
                    <button
                      type="button"
                      className="text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Jawab
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800 p-4">
        <CommentInput
          postID={post.id}
          placeholder="Tambah komentar..."
          onCommentAdded={handleCommentAdded}
          compact
        />
      </div>
    </div>
  );
};

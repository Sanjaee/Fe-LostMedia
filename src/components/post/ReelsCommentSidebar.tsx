"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { CommentInput } from "./CommentInput";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Heart, MessageCircle } from "lucide-react";
import type { Comment } from "@/types/comment";
import type { Post } from "@/types/post";

const DUMMY_COMMENTS: Comment[] = [
  {
    id: "dummy-c1",
    post_id: "",
    user_id: "u1",
    content: "Keren banget! 🔥",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "u1",
      full_name: "Budi Santoso",
      username: "budisantoso",
      profile_photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=budi",
    },
    like_count: 114,
  },
  {
    id: "dummy-c2",
    post_id: "",
    user_id: "u2",
    content: "Mantap videonya! Sukses terus",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "u2",
      full_name: "Siti Aminah",
      username: "sitiaminah",
      profile_photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=siti",
    },
    like_count: 89,
  },
  {
    id: "dummy-c3",
    post_id: "",
    user_id: "u3",
    content: "Gila AI serem banget 😱",
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "u3",
      full_name: "Andi Wijaya",
      username: "andiwijaya",
      profile_photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=andi",
    },
    like_count: 256,
  },
  {
    id: "dummy-c4",
    post_id: "",
    user_id: "u4",
    content: "GEMES BANGET! ❤️",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "u4",
      full_name: "Dewi Lestari",
      username: "dewilestari",
      profile_photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=dewi",
    },
    like_count: 432,
  },
  {
    id: "dummy-c5",
    post_id: "",
    user_id: "u5",
    content: "Bentar sayang mama lagi nyawit",
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    user: {
      id: "u5",
      full_name: "Rina Kusuma",
      username: "rinakusuma",
      profile_photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=rina",
    },
    like_count: 67,
  },
];

interface ReelsCommentSidebarProps {
  post: Post | null;
  variant?: "sidebar" | "bottomsheet";
  onClose?: () => void;
  onCommentCountChange?: (count: number) => void;
  refreshTrigger?: number;
}

export const ReelsCommentSidebar: React.FC<ReelsCommentSidebarProps> = ({
  post,
  variant = "sidebar",
  onClose,
  onCommentCountChange,
  refreshTrigger = 0,
}) => {
  const comments = DUMMY_COMMENTS;
  const count = comments.length;

  if (!post) return null;

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
        {comments.length === 0 ? (
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
          onCommentAdded={() => onCommentCountChange?.(count + 1)}
          compact
        />
      </div>
    </div>
  );
};

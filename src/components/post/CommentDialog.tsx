"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { CommentList } from "./CommentList";
import { CommentInput } from "./CommentInput";
import { useApi } from "@/components/contex/ApiProvider";
import { Loader2 } from "lucide-react";
import type { Post } from "@/types/post";

interface CommentDialogProps {
  open: boolean;
  onClose: () => void;
  post: Post | null;
  onCommentCountChange?: (count: number) => void;
}

export const CommentDialog: React.FC<CommentDialogProps> = ({
  open,
  onClose,
  post,
  onCommentCountChange,
}) => {
  const { api } = useApi();
  const [commentCount, setCommentCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    if (open && post) {
      loadCommentCount();
    }
  }, [open, post]);

  const loadCommentCount = async () => {
    if (!post) return;

    try {
      setLoadingCount(true);
      const response = await api.getCommentCount(post.id);
      setCommentCount(response.count || 0);
    } catch (error) {
      console.error("Failed to load comment count:", error);
    } finally {
      setLoadingCount(false);
    }
  };

  const handleCommentAdded = () => {
    loadCommentCount();
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Komentar</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {loadingCount ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memuat...</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {commentCount} {commentCount === 1 ? "komentar" : "komentar"}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          <CommentList
            postID={post.id}
            onCommentCountChange={(count) => {
              setCommentCount(count);
              onCommentCountChange?.(count);
            }}
          />
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <CommentInput
            postID={post.id}
            placeholder="Tulis komentar..."
            onCommentAdded={handleCommentAdded}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

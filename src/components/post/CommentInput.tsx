"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { Send, Smile, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";

interface CommentInputProps {
  postID: string;
  parentID?: string;
  parentUserName?: string;
  placeholder?: string;
  onCommentAdded?: () => void;
  compact?: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  postID,
  parentID,
  parentUserName,
  placeholder,
  onCommentAdded,
  compact = false,
}) => {
  // Set default placeholder based on whether it's a reply or new comment
  const defaultPlaceholder = parentID && parentUserName 
    ? `Balas kepada ${parentUserName}...`
    : parentID 
    ? "Tulis balasan..."
    : "Tulis komentar...";
  
  const finalPlaceholder = placeholder || defaultPlaceholder;
  const { data: session } = useSession();
  const { api } = useApi();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    try {
      await api.createComment({
        post_id: postID,
        parent_id: parentID,
        content: content.trim(),
      });

      setContent("");
      // Auto reload comments without toast
      onCommentAdded?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menambahkan komentar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || undefined} />
          <AvatarFallback>
            {getInitials(session?.user?.name || "User")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={finalPlaceholder}
            className="flex-1 bg-transparent border-none outline-none text-sm"
            disabled={loading}
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={!content.trim() || loading}
            className="h-8 w-8 p-0"
          >
            {loading ? (
              <Skeleton className="h-4 w-4 shrink-0" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || undefined} />
          <AvatarFallback>
            {getInitials(session?.user?.name || "User")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={finalPlaceholder}
            rows={3}
            className="resize-none"
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Smile className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || loading}
            >
              {loading ? (
                <>
                  <Skeleton className="h-4 w-4 mr-2 shrink-0" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Kirim
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

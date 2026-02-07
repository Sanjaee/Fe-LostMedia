"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, Reply, MoreHorizontal, Trash2, Edit, MessageCircle } from "lucide-react";
import type { Comment } from "@/types/comment";
import { CommentInput } from "./CommentInput";
import { LikeButton } from "./LikeButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession } from "next-auth/react";

interface CommentListProps {
  postID: string;
  onCommentCountChange?: (count: number) => void;
  refreshTrigger?: number;
}

export const CommentList: React.FC<CommentListProps> = ({
  postID,
  onCommentCountChange,
  refreshTrigger,
}) => {
  const { api } = useApi();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const onCommentCountChangeRef = useRef(onCommentCountChange);
  const apiRef = useRef(api);
  const toastRef = useRef(toast);
  
  useEffect(() => {
    onCommentCountChangeRef.current = onCommentCountChange;
    apiRef.current = api;
    toastRef.current = toast;
  }, [onCommentCountChange, api, toast]);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRef.current.getCommentsByPostID(postID, 50, 0);
      const commentsList = response.comments || response.data?.comments || [];
      const totalCount = response.total || response.data?.total || commentsList.length;
      
      setComments(commentsList);
      onCommentCountChangeRef.current?.(totalCount);
    } catch (error: any) {
      console.error("Failed to load comments:", error);
      toastRef.current({
        title: "Error",
        description: error.message || "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [postID]);

  useEffect(() => {
    loadComments();
  }, [loadComments, refreshTrigger]);

  const handleDeleteClick = (commentID: string) => {
    setCommentToDelete(commentID);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return;

    try {
      setDeleting(true);
      await api.deleteComment(commentToDelete);
      toast({
        title: "Berhasil",
        description: "Komentar berhasil dihapus",
      });
      loadComments();
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus komentar",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = async (commentID: string) => {
    if (!editContent.trim()) return;

    try {
      await api.updateComment(commentID, { content: editContent });
      toast({
        title: "Berhasil",
        description: "Komentar berhasil diupdate",
      });
      setEditingId(null);
      setEditContent("");
      loadComments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal mengupdate komentar",
        variant: "destructive",
      });
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

  const renderComment = (comment: Comment, level = 0) => {
    // Check if comment belongs to current user - check both ID and email as fallback
    const currentUserId = session?.user?.id;
    const currentUserEmail = session?.user?.email;
    const commentUserId = comment.user_id;
    const commentUserEmail = (comment.user as any)?.email;
    
    let isOwnComment = false;
    if (currentUserId && commentUserId) {
      // Primary check: compare user IDs (convert to string for comparison)
      isOwnComment = String(commentUserId) === String(currentUserId);
      
      // Fallback: if IDs don't match, check by email (for Google OAuth cases where ID might be different)
      if (!isOwnComment && currentUserEmail && commentUserEmail) {
        isOwnComment = String(currentUserEmail).toLowerCase() === String(commentUserEmail).toLowerCase();
      }
    }
    
    const isEditing = editingId === comment.id;
    const isReply = level > 0;

    return (
      <div key={comment.id} className="space-y-3">
        {/* Comment Container */}
        <div className={`flex items-start gap-3 ${isReply ? "ml-12" : ""}`}>
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage
              src={comment.user?.profile_photo}
              alt={comment.user?.full_name}
            />
            <AvatarFallback>
              {getInitials(comment.user?.full_name || "User")}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1 gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {isReply && comment.parent?.user ? (
                    <>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {comment.user?.full_name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        balas
                      </span>
                      <span className="font-semibold text-sm text-blue-600 dark:text-blue-400 truncate">
                        {comment.parent.user.full_name}
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {comment.user?.full_name}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: id,
                    })}
                  </span>
                </div>
                
                {isOwnComment && !isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingId(comment.id);
                        setEditContent(comment.content);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(comment.id)}
                        className="text-red-600 dark:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEdit(comment.id)}
                      disabled={!editContent.trim()}
                    >
                      Simpan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditContent("");
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-4 mt-1">
              <LikeButton
                targetType="comment"
                targetID={comment.id}
                initialLikeCount={comment.like_count || 0}
                compact
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="h-8 px-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                <Reply className="h-4 w-4 mr-1" />
                Balas
              </Button>
            </div>
            
            {replyingTo === comment.id && (
              <div className="mt-2">
                <CommentInput
                  postID={postID}
                  parentID={comment.id}
                  parentUserName={comment.user?.full_name}
                  placeholder="Tulis balasan..."
                  onCommentAdded={() => {
                    setReplyingTo(null);
                    loadComments();
                  }}
                  compact
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Nested Replies - Rendered BELOW parent comment */}
        {comment.replies && comment.replies.length > 0 && (
          <div>
            {comment.replies.map((reply) => renderComment(reply, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center justify-center">
          <MessageCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Belum ada komentar
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Jadilah yang pertama berkomentar!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {comments.map((comment) => renderComment(comment, 0))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Komentar?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus komentar ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setCommentToDelete(null);
            }}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                "Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
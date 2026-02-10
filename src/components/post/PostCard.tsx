"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Trash2,
  ChevronRight,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import { LikeButton } from "@/components/post/LikeButton";
import { parseTextWithLinks } from "@/utils/textUtils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Post } from "@/types/post";

interface PostCardProps {
  post: Post;
  session: any;
  api: any;
  viewedPosts: Set<string>;
  setViewedPosts: React.Dispatch<React.SetStateAction<Set<string>>>;
  postLikeCounts: Record<string, number>;
  postUserLikes: Record<string, any>;
  postCommentCounts: Record<string, number>;
  handleLikeChange: (postId: string, liked: boolean, likeCount: number) => void;
  handleOpenCommentDialog: (post: Post) => void;
  handleImageClick: (post: Post, imageIndex: number) => void;
  handleVideoClick?: (post: Post, videoIndex: number) => void;
  onPostDeleted?: (postId: string) => void;
}

export function PostCard({
  post,
  session,
  api,
  viewedPosts,
  setViewedPosts,
  postLikeCounts,
  postUserLikes,
  postCommentCounts,
  handleLikeChange,
  handleOpenCommentDialog,
  handleImageClick,
  handleVideoClick,
  onPostDeleted,
}: PostCardProps) {
  // Gabung gambar + video jadi satu media (gambar dulu, lalu video) untuk layout seperti foto
  const mediaItems: { type: "image"; url: string; index: number }[] = (post.image_urls || []).map((url, i) => ({ type: "image" as const, url, index: i }));
  const videoItems: { type: "video"; url: string; index: number }[] = (post.video_urls || []).map((url, i) => ({ type: "video" as const, url, index: i }));
  const allMedia = [...mediaItems, ...videoItems];
  const hasMedia = allMedia.length > 0;
  const postRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      await api.deletePost(post.id);
      toast({
        title: "Berhasil",
        description: "Post berhasil dihapus",
      });
      if (onPostDeleted) {
        onPostDeleted(post.id);
      }
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus post",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Track view when post enters viewport
  useEffect(() => {
    if (!session?.user?.id || viewedPosts.has(post.id)) {
      return; // Already viewed or not authenticated
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !viewedPosts.has(post.id)) {
            // Post is visible and not yet viewed
            api.trackPostView(post.id).catch((err: any) => {
              console.error("Failed to track view:", err);
            });
            
            // Mark as viewed to prevent duplicate tracking
            setViewedPosts((prev) => new Set(prev).add(post.id));
            
            // Disconnect observer after tracking
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.5, // Track when 50% of post is visible
        rootMargin: "0px",
      }
    );

    if (postRef.current) {
      observer.observe(postRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [post.id, session?.user?.id, viewedPosts, api, setViewedPosts]);

  return (
    <Card ref={postRef} className="border-none shadow-sm overflow-hidden py-0">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.user?.username || post.user_id}`} className="hover:opacity-80 transition-opacity shrink-0">
              <Avatar className="w-10 h-10 border">
                <AvatarImage src={post.user?.profile_photo || ''} />
                <AvatarFallback>{post.user?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0">
              <div className="font-semibold text-sm flex items-center gap-1 flex-wrap">
                <Link href={`/profile/${post.user?.username || post.user_id}`} className="hover:underline cursor-pointer">
                  <UserNameWithRole
                    displayName={post.user?.username || post.user?.full_name || "Unknown"}
                    role={post.user?.role ?? (post.user as any)?.user_type}
                    className="truncate inline-block max-w-full"
                  />
                </Link>
                {post.group && post.group.name && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                    <Link
                      href={`/groups/${post.group.slug || post.group_id}`}
                      className="text-zinc-700 dark:text-zinc-300 hover:underline font-semibold truncate max-w-[180px]"
                    >
                      {post.group.name}
                    </Link>
                  </>
                )}
              </div>
              <div className="text-xs text-zinc-500 flex items-center gap-1">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: id })}
                <span>•</span>
                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" className="text-zinc-500">
                  <title>Public</title>
                  <g fillRule="evenodd">
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" clipRule="evenodd"></path>
                    <path d="M10.166 8a2.166 2.166 0 11-4.332 0 2.166 2.166 0 014.332 0zM6.657 12.834a3.834 3.834 0 016.51-2.998 3.834 3.834 0 01-2.997 6.509 3.834 3.834 0 01-3.513-3.511z"></path>
                  </g>
                </svg>
              </div>
            </div>
          </div>
          {/* Admin Delete Button - Always show button, but only show menu if admin */}
          {(() => {
            // Use same check as MainNavbar
            const userType = 
              session?.userType || 
              session?.user?.userType || 
              session?.user?.user_type || 
              session?.user?.role || 
              (session?.user as any)?.userType;
            
            const isAdminUser = userType === "owner";
            
            if (!isAdminUser) return null;
            
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    className="text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Hapus (Admin)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Post Content */}
        <div className="px-4 py-2">
          {post.content && (
            <p className="text-base whitespace-pre-wrap">
              {parseTextWithLinks(post.content).map((part, index) => {
                if (part.type === 'link') {
                  return (
                    <a
                      key={index}
                      href={part.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 hover:underline break-all"
                    >
                      {part.content}
                    </a>
                  );
                }
                return <span key={index}>{part.content}</span>;
              })}
            </p>
          )}
        </div>

        {/* Post Media: gambar + video satu layout (seperti foto), video diklik untuk tonton */}
        {hasMedia && (
          <div className="mt-2">
            <div
              className={`grid gap-1 overflow-hidden ${
                allMedia.length === 1
                  ? "grid-cols-1"
                  : allMedia.length === 2
                    ? "grid-cols-2"
                    : allMedia.length >= 3
                      ? "grid-cols-2 grid-rows-2"
                      : ""
              }`}
            >
              {allMedia.slice(0, 4).map((item, idx) => {
                const isFirst = idx === 0;
                const isThreeLayout = allMedia.length === 3;
                const spanTwo = isThreeLayout && isFirst;
                return (
                  <button
                    key={`${item.type}-${item.index}`}
                    type="button"
                    onClick={() => {
                      if (item.type === "image") {
                        handleImageClick(post, item.index);
                      } else if (handleVideoClick) {
                        handleVideoClick(post, item.index);
                      }
                    }}
                    className={`relative bg-zinc-100 dark:bg-zinc-900 cursor-pointer block w-full overflow-hidden ${
                      allMedia.length === 1
                        ? "h-auto min-h-[200px]"
                        : spanTwo
                          ? "row-span-2 aspect-[4/5]"
                          : "aspect-square"
                    }`}
                  >
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt={`Post image ${item.index + 1}`}
                        className={`w-full h-full object-cover`}
                        loading="lazy"
                      />
                    ) : (
                      <>
                        <video
                          src={item.url}
                          preload="metadata"
                          className="w-full h-full object-cover pointer-events-none"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
                          <div className="rounded-full bg-white/90 dark:bg-zinc-800 p-3 shadow-lg">
                            <Play className="w-8 h-8 text-zinc-900 dark:text-zinc-100 fill-current" />
                          </div>
                        </div>
                      </>
                    )}
                    {allMedia.length > 4 && idx === 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
                        +{allMedia.length - 4}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Stats */}
        {(() => {
          // Use counts from post data if available, otherwise use from props
          const likeCount = post.likes_count !== undefined ? post.likes_count : (postLikeCounts[post.id] || 0);
          const commentCount = post.comments_count !== undefined ? post.comments_count : (postCommentCounts[post.id] || 0);
          
          return (likeCount > 0 || commentCount > 0) ? (
            <div className="px-4 py-2 flex items-center justify-between text-zinc-500 text-sm">
              <div className="flex items-center gap-1">
                {likeCount > 0 && (
                  <>
                    <div className="bg-blue-500 rounded-full p-1">
                      <ThumbsUp className="w-3 h-3 text-white fill-white" />
                    </div>
                    <span>{likeCount}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4">
                {commentCount > 0 && (
                  <span>{commentCount} komentar</span>
                )}
              </div>
            </div>
          ) : null;
        })()}
        
        <Separator />

        {/* Actions */}
        <div className="flex items-center px-4 py-1 gap-0">
          <div className="flex-1 flex justify-center">
            <LikeButton
              targetType="post"
              targetID={post.id}
              initialLikeCount={post.likes_count !== undefined ? post.likes_count : (postLikeCounts[post.id] || 0)}
              initialUserLike={
                postUserLikes[post.id] !== undefined
                  ? (postUserLikes[post.id] || null)
                  : (post.user_liked ? { user_id: post.user_id, post_id: post.id } : null)
              }
              onLikeChange={(liked, count) => handleLikeChange(post.id, liked, count)}
            />
          </div>
          <Button 
            variant="ghost" 
            className="flex-1 gap-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => handleOpenCommentDialog(post)}
          >
            <MessageCircle className="w-5 h-5" />
            <span>Komentari</span>
            {(() => {
              const commentCount = post.comments_count !== undefined ? post.comments_count : (postCommentCounts[post.id] || 0);
              return commentCount > 0 ? (
                <span className="ml-1">({commentCount})</span>
              ) : null;
            })()}
          </Button>
          <Button variant="ghost" className="flex-1 gap-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Share2 className="w-5 h-5" />
            <span>Bagikan</span>
          </Button>
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Post (Admin)?</AlertDialogTitle>
            <AlertDialogDescription>
              Sebagai admin, Anda akan menghapus post ini. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
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
    </Card>
  );
}

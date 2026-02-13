"use client";

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, MoreHorizontal, ThumbsUp, MessageCircle, Share2, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useApi } from "@/components/contex/ApiProvider";
import type { Post } from "@/types/post";
import { parseTextWithLinks } from "@/utils/textUtils";
import { CommentList } from "@/components/post/CommentList";
import { CommentInput } from "@/components/post/CommentInput";

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  /** Index di daftar media gabungan (gambar dulu, lalu video) */
  imageIndex: number;
  onNavigateImage?: (direction: 'prev' | 'next') => void;
  /** Optional: lompat langsung ke media index (untuk klik thumbnail) */
  onNavigateToIndex?: (index: number) => void;
}

export default function PhotoModal({ isOpen, onClose, post, imageIndex, onNavigateImage, onNavigateToIndex }: PhotoModalProps) {
  const { api } = useApi();
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (isOpen && post) {
      // Use counts from post when available (avoids duplicate API hit)
      if (post.likes_count !== undefined && post.comments_count !== undefined) {
        setLikeCount(post.likes_count);
        setCommentCount(post.comments_count);
        return;
      }
      const loadStats = async () => {
        if (!post) return;
        try {
          setLoadingStats(true);
          const [likeRes, commentRes] = await Promise.all([
            api.getLikeCount("post", post.id).catch(() => ({ count: 0 })),
            api.getCommentCount(post.id).catch(() => ({ count: 0 })),
          ]);
          setLikeCount(likeRes.count || 0);
          setCommentCount(commentRes.count || 0);
        } catch (error) {
          console.error("Failed to load stats:", error);
        } finally {
          setLoadingStats(false);
        }
      };
      loadStats();
    }
  }, [isOpen, post, api]);

  const handleCommentAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
    if (post) {
      api.getCommentCount(post.id).then((res) => setCommentCount(res.count || 0)).catch(() => {});
    }
  };

  if (!post) return null;

  // Gabung image + video jadi satu list (gambar dulu, lalu video) untuk detail
  const imageItems: { type: 'image'; url: string }[] = (post.image_urls || []).map((url) => ({ type: 'image' as const, url }));
  const videoItems: { type: 'video'; url: string }[] = (post.video_urls || []).map((url) => ({ type: 'video' as const, url }));
  const allMedia = [...imageItems, ...videoItems];
  const totalMedia = allMedia.length;
  const currentMedia = allMedia[imageIndex];
  const hasPrev = imageIndex > 0;
  const hasNext = imageIndex < totalMedia - 1;

  if (!currentMedia) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="w-full h-screen p-0 border-none bg-transparent shadow-none z-[61] gap-0 sm:rounded-none outline-none focus:outline-none [&>button]:hidden block fixed inset-0 top-0 left-0 translate-x-0 translate-y-0"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Photo Viewer</DialogTitle>
        <div className="flex flex-col md:flex-row w-[100vw] h-full overflow-hidden">
          {/* Left Side: Image - Full Screen */}
          <div className="flex-1 bg-black flex items-center justify-center relative h-[50vh] md:h-full group overflow-hidden">
           {/* Close Button (Mobile/Desktop overlay) */}
           <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 left-4 z-50 text-white hover:bg-white/10 rounded-full bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Navigation Arrows */}
          {hasPrev && onNavigateImage && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/10 rounded-full bg-black/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onNavigateImage('prev')}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}
          {hasNext && onNavigateImage && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/10 rounded-full bg-black/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onNavigateImage('next')}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}

          {/* Media Counter */}
          {totalMedia > 1 && (
            <div className="absolute top-4 right-4 z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              {imageIndex + 1} / {totalMedia}
            </div>
          )}

          {/* Main Media Container - Image atau Video */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {currentMedia.type === 'video' ? (
              <video
                src={currentMedia.url}
                controls
                autoPlay
                playsInline
                className="object-contain max-w-full max-h-full w-auto h-auto"
              />
            ) : (
              <img
                src={currentMedia.url}
                alt={`Post by ${post.user?.full_name}`}
                className="object-contain"
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            )}
          </div>
        </div>

        {/* Right Side: Sidebar (Post Details) */}
        <div className="w-full md:w-[460px] lg:w-[500px] bg-white dark:bg-zinc-950 flex flex-col h-[50vh] md:h-full border-l border-zinc-800">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border">
                <AvatarImage src={post.user?.profile_photo || ''} />
                <AvatarFallback>{post.user?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <Link href={`/profile/${post.user?.username || post.user_id}`} className="font-semibold text-sm cursor-pointer block">
                  <UserNameWithRole
                    displayName={post.user?.username || post.user?.full_name || "Unknown User"}
                    role={(post.user as any)?.user_type ?? (post.user as any)?.role}
                    className="truncate inline-block max-w-full"
                  />
                </Link>
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  {format(new Date(post.created_at), "d-M-yyyy HH:mm")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
               {/* Close button for Sidebar context (optional, redundant with overlay close but good UX) */}
               <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 rounded-full" onClick={onClose}>
                 <X className="w-5 h-5" />
               </Button>
            </div>
          </div>

          {/* Content (Caption + Comments) */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
             {/* Caption */}
             {post.content && (
               <div className="mb-4 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
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
               </div>
             )}
             
             <Separator className="my-4" />
             
             {/* Stats */}
             <div className="flex items-center justify-between text-zinc-500 text-xs mb-4">
                {loadingStats ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-3 h-3 shrink-0" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ) : (
                  <>
                    {likeCount > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="bg-blue-500 rounded-full p-1">
                          <ThumbsUp className="w-2 h-2 text-white fill-white" />
                        </div>
                        <span>{likeCount}</span>
                      </div>
                    )}
                    <div className="flex gap-2 ml-auto">
                      {commentCount > 0 && (
                        <span>{commentCount} komentar</span>
                      )}
                    </div>
                  </>
                )}
             </div>

             {/* Action Buttons */}
             <div className="flex border-y border-zinc-200 dark:border-zinc-800 py-1 mb-4">
                <Button variant="ghost" className="flex-1 h-8 text-xs gap-2 text-zinc-600 dark:text-zinc-400">
                  <ThumbsUp className="w-4 h-4" /> Suka
                </Button>
                <Button variant="ghost" className="flex-1 h-8 text-xs gap-2 text-zinc-600 dark:text-zinc-400">
                  <MessageCircle className="w-4 h-4" /> Komentar
                </Button>
                <Button variant="ghost" className="flex-1 h-8 text-xs gap-2 text-zinc-600 dark:text-zinc-400">
                  <Share2 className="w-4 h-4" /> Bagikan
                </Button>
             </div>

             {/* Comments */}
             <div className="space-y-4">
               <p className="text-sm font-semibold text-zinc-500">Komentar Terbaru</p>
               <CommentList
                 postID={post.id}
                 refreshTrigger={refreshTrigger}
                 onCommentCountChange={(count) => {
                   setCommentCount(count);
                 }}
               />
             </div>
          </div>

          {/* Footer: Input Comment */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
             <CommentInput
               postID={post.id}
               placeholder="Tulis komentar..."
               onCommentAdded={handleCommentAdded}
               compact
             />
          </div>

          {/* Thumbnail Navigation (jika ada lebih dari satu media: image + video) */}
          {totalMedia > 1 && (
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {allMedia.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (idx === imageIndex) return;
                      if (onNavigateToIndex) onNavigateToIndex(idx);
                      else if (onNavigateImage) {
                        if (idx < imageIndex) onNavigateImage('prev');
                        else onNavigateImage('next');
                      }
                    }}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 flex items-center justify-center ${
                      idx === imageIndex
                        ? 'border-blue-500'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    } transition-all cursor-pointer bg-zinc-100 dark:bg-zinc-800`}
                  >
                    {item.type === 'video' ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white drop-shadow" fill="currentColor" />
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
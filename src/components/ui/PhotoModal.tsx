import React from 'react';
import Link from "next/link";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, MoreHorizontal, ThumbsUp, MessageCircle, Share2, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { Post } from "@/types/post";
import { parseTextWithLinks } from "@/utils/textUtils";

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  imageIndex: number;
  onNavigateImage?: (direction: 'prev' | 'next') => void;
}

export default function PhotoModal({ isOpen, onClose, post, imageIndex, onNavigateImage }: PhotoModalProps) {
  if (!post) return null;
  const imageUrl = post.image_urls && post.image_urls[imageIndex] ? post.image_urls[imageIndex] : '';
  const totalImages = post.image_urls?.length || 0;
  const hasPrev = imageIndex > 0;
  const hasNext = imageIndex < totalImages - 1;

  if (!imageUrl) return null;

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

          {/* Image Counter */}
          {totalImages > 1 && (
            <div className="absolute top-4 right-4 z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              {imageIndex + 1} / {totalImages}
            </div>
          )}

          {/* Main Image Container - Auto sizing */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
             <img 
              src={imageUrl} 
              alt={`Post by ${post.user?.full_name}`} 
              className="object-contain"
              style={{ 
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'block',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>

        {/* Right Side: Sidebar (Post Details) */}
        <div className="w-full md:w-[360px] lg:w-[400px] bg-white dark:bg-zinc-950 flex flex-col h-[50vh] md:h-full border-l border-zinc-800">
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border">
                <AvatarImage src={post.user?.profile_photo || ''} />
                <AvatarFallback>{post.user?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <Link href={`/profile/${post.user_id}`} className="font-semibold text-sm hover:underline cursor-pointer block">
                  {post.user?.full_name || 'Unknown User'}
                </Link>
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: idLocale })}
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
                <div className="flex items-center gap-1">
                  <div className="bg-blue-500 rounded-full p-1">
                    <ThumbsUp className="w-2 h-2 text-white fill-white" />
                  </div>
                  <span>0</span>
                </div>
                <div className="flex gap-2">
                  <span>0 komentar</span>
                  <span>0 dibagikan</span>
                </div>
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

             {/* Comments Placeholder */}
             <div className="space-y-4">
               <p className="text-sm font-semibold text-zinc-500">Komentar Terbaru</p>
               {/* Dummy Comments */}
               {[1, 2, 3].map((i) => (
                 <div key={i} className="flex gap-2">
                   <Avatar className="w-8 h-8">
                     <AvatarFallback>U{i}</AvatarFallback>
                   </Avatar>
                   <div className="flex-1">
                     <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-3 py-2 inline-block">
                       <span className="font-semibold text-xs block">User {i}</span>
                       <span className="text-sm">Keren banget fotonya! 🔥</span>
                     </div>
                     <div className="flex gap-3 mt-1 ml-2 text-xs text-zinc-500 font-semibold">
                       <span className="cursor-pointer hover:underline">Suka</span>
                       <span className="cursor-pointer hover:underline">Balas</span>
                       <span>1j</span>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Footer: Input Comment */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
             <div className="flex gap-2 items-center">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>Me</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center px-3 py-2">
                   <input 
                    type="text" 
                    placeholder="Tulis komentar..." 
                    className="bg-transparent border-none outline-none text-sm w-full"
                   />
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:bg-blue-50 hover:text-blue-600 rounded-full">
                     <Send className="w-4 h-4" />
                   </Button>
                </div>
             </div>
          </div>

          {/* Thumbnail Navigation (if multiple images) */}
          {totalImages > 1 && (
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {post.image_urls?.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => onNavigateImage && idx !== imageIndex && (idx < imageIndex ? onNavigateImage('prev') : onNavigateImage('next'))}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      idx === imageIndex 
                        ? 'border-blue-500' 
                        : 'border-transparent opacity-60 hover:opacity-100'
                    } transition-all cursor-pointer`}
                  >
                    <img 
                      src={url} 
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
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
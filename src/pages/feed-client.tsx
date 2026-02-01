"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Image as ImageIcon,
  Video,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import type { Post } from "@/types/post";

interface FeedClientProps {
  posts: Post[];
}

const SCROLL_POSITION_KEY = "feed_scroll_position";

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

export default function FeedClient({ posts }: FeedClientProps) {
  const { data: session } = useSession();
  const scrollRestoredRef = useRef(false);
  
  // Handle case when posts is undefined (during build/prerender)
  if (!posts || !Array.isArray(posts)) {
    return null;
  }

  // Restore scroll position when component mounts
  useEffect(() => {
    if (scrollRestoredRef.current) return;
    
    const savedScroll = sessionStorage.getItem(SCROLL_POSITION_KEY);
    if (savedScroll) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScroll, 10));
        scrollRestoredRef.current = true;
      });
    }
  }, []);

  // Save scroll position before navigating
  const handleImageClick = () => {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    sessionStorage.setItem(SCROLL_POSITION_KEY, scrollPosition.toString());
  };

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY || document.documentElement.scrollTop;
      sessionStorage.setItem(SCROLL_POSITION_KEY, scrollPosition.toString());
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pt-4">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Navigation */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            <div className="sticky top-20 space-y-2">
              <Button variant="ghost" className="w-full justify-start text-lg font-medium" asChild>
                <Link href="/">
                  <div className="mr-3 h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                    </svg>
                  </div>
                  Beranda
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start text-lg font-medium">
                <div className="mr-3 h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                </div>
                Teman
              </Button>
            </div>
          </div>

          {/* Main Feed */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            
            {/* Create Post Widget */}
            {session && (
              <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-4 mb-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={session.user?.image || ''} />
                      <AvatarFallback>{session.user?.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <Link href="/blog/new" className="flex-1">
                      <div className="w-full h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center px-4 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                        Apa yang Anda pikirkan, {session.user?.name?.split(' ')[0]}?
                      </div>
                    </Link>
                  </div>
                  <Separator className="mb-4" />
                  <div className="flex justify-between px-4">
                    <Button variant="ghost" className="flex-1 gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Video className="w-6 h-6" />
                      <span className="hidden sm:inline">Video Langsung</span>
                    </Button>
                    <Button variant="ghost" className="flex-1 gap-2 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" asChild>
                      <Link href="/blog/new">
                        <ImageIcon className="w-6 h-6" />
                        <span className="hidden sm:inline">Foto/Video</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" className="flex-1 gap-2 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                      <Smile className="w-6 h-6" />
                      <span className="hidden sm:inline">Perasaan/Aktivitas</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts && posts.length > 0 ? (
                posts.map((post) => (
                  <Card key={post.id} className="border-none shadow-sm overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border">
                          <AvatarImage src={post.user?.profile_photo || ''} />
                          <AvatarFallback>{post.user?.full_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-sm hover:underline cursor-pointer">
                            {post.user?.full_name || 'Unknown User'}
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {/* Post Content */}
                    <div className="px-4 py-2">
                      {post.content && <p className="text-base whitespace-pre-wrap">{post.content}</p>}
                    </div>

                    {/* Post Images */}
                    {post.image_urls && post.image_urls.length > 0 && (
                      <div className="mt-2">
                        {/* Simple grid for multiple images */}
                        <div className={`grid gap-1 ${
                          post.image_urls.length === 1 ? 'grid-cols-1' : 
                          post.image_urls.length === 2 ? 'grid-cols-2' : 
                          post.image_urls.length >= 3 ? 'grid-cols-2' : ''
                        }`}>
                          {post.image_urls.slice(0, 4).map((img, idx) => (
                            <Link 
                              key={idx} 
                              href={`/photo/${post.id}?index=${idx}`}
                              scroll={false}
                              onClick={handleImageClick}
                              className={`relative bg-zinc-100 cursor-pointer block ${
                                post.image_urls!.length === 3 && idx === 0 ? 'row-span-2 h-full' : 'aspect-square'
                              } ${
                                post.image_urls!.length === 1 ? 'aspect-auto max-h-[500px]' : ''
                              }`}
                            >
                              <img 
                                src={img} 
                                alt={`Post image ${idx + 1}`} 
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {post.image_urls!.length > 4 && idx === 3 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
                                  +{post.image_urls!.length - 4}
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Stats - Placeholder for now */}
                    <div className="px-4 py-2 flex items-center justify-between text-zinc-500 text-sm">
                      <div className="flex items-center gap-1">
                        <div className="bg-blue-500 rounded-full p-1">
                          <ThumbsUp className="w-3 h-3 text-white fill-white" />
                        </div>
                        <span>0</span>
                      </div>
                      <div className="flex gap-4">
                        <span>0 komentar</span>
                        <span>0 kali dibagikan</span>
                      </div>
                    </div>
                    
                    <Separator />

                    {/* Actions */}
                    <div className="flex px-2 py-1">
                      <Button variant="ghost" className="flex-1 gap-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <ThumbsUp className="w-5 h-5" />
                        <span>Suka</span>
                      </Button>
                      <Button variant="ghost" className="flex-1 gap-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <MessageCircle className="w-5 h-5" />
                        <span>Komentari</span>
                      </Button>
                      <Button variant="ghost" className="flex-1 gap-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <Share2 className="w-5 h-5" />
                        <span>Bagikan</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                ))
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <p>No posts available</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Contacts/Sponsored */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            <div className="sticky top-20">
              <div className="mb-4">
                <h3 className="text-zinc-500 font-semibold mb-2 px-2">Disponsori</h3>
                {/* Ads placeholder */}
                <div className="flex items-center gap-3 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                  <div className="w-24 h-24 bg-zinc-300 rounded-lg shrink-0"></div>
                  <div>
                    <div className="font-semibold text-sm">Iklan Menarik</div>
                    <div className="text-xs text-zinc-500">website.com</div>
                  </div>
                </div>
              </div>
              <Separator className="my-2" />
              <div>
                <h3 className="text-zinc-500 font-semibold mb-2 px-2">Kontak</h3>
                {/* Contacts List */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>F{i}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900"></div>
                    </div>
                    <div className="font-medium text-sm">Teman {i}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
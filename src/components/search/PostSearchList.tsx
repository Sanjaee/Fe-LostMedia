"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import type { Post } from "@/types/post";

interface PostSearchListProps {
  keyword: string;
  limit?: number;
  onCountChange?: (count: number) => void;
}

export const PostSearchList: React.FC<PostSearchListProps> = ({ 
  keyword, 
  limit = 5,
  onCountChange
}) => {
  const { api } = useApi();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (keyword?.trim()) {
      searchPosts();
    } else {
      setPosts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const searchPosts = async () => {
    if (!keyword?.trim()) {
      setPosts([]);
      if (onCountChange) {
        onCountChange(0);
      }
      return;
    }

    try {
      setLoading(true);
      // Try searchPosts API first, fallback to getFeed if not available
      let response;
      try {
        response = await api.searchPosts(keyword, limit, 0) as any;
      } catch {
        // Fallback: get feed and filter by keyword
        response = await api.getFeed(50, 0, "newest") as any;
      }

      let postsList: Post[] = [];
      if (response.posts && Array.isArray(response.posts)) {
        postsList = response.posts;
      } else if (response.data?.posts && Array.isArray(response.data.posts)) {
        postsList = response.data.posts;
      } else if (Array.isArray(response)) {
        postsList = response;
      }

      // Filter by keyword if using fallback (getFeed)
      if (postsList.length > 0) {
        // Check if response has posts property (from searchPosts API)
        const isSearchResult = response.posts || response.data?.posts;
        
        if (!isSearchResult) {
          // Using fallback - filter by keyword
          const keywordLower = keyword.toLowerCase();
          postsList = postsList.filter((post: Post) => {
            const contentMatch = post.content?.toLowerCase().includes(keywordLower);
            const authorMatch = post.user?.full_name?.toLowerCase().includes(keywordLower) ||
                              post.user?.username?.toLowerCase().includes(keywordLower);
            return contentMatch || authorMatch;
          });
        }
      }

      const finalPosts = postsList.slice(0, limit);
      setPosts(finalPosts);
      
      // Notify parent of count change
      if (onCountChange) {
        onCountChange(finalPosts.length);
      }
    } catch (error: any) {
      console.error("Failed to search posts:", error);
      if (onCountChange) {
        onCountChange(0);
      }
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!keyword?.trim()) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Masukkan kata kunci untuk mencari posts
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Tidak ada posts yang ditemukan
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id} className="border-none shadow-sm overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <Link 
              href={`/profile/${post.user_id}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Avatar className="w-10 h-10 border">
                <AvatarImage src={post.user?.profile_photo || ''} />
                <AvatarFallback>
                  {post.user?.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-sm hover:underline cursor-pointer text-gray-900 dark:text-white">
                  {post.user?.full_name || 'Unknown'}
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-1">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: id })}
                </div>
              </div>
            </Link>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Post Content */}
            {post.content && (
              <div className="px-4 py-2">
                <p className="text-base whitespace-pre-wrap text-gray-900 dark:text-white">
                  {post.content}
                </p>
              </div>
            )}

            {/* Post Images */}
            {post.image_urls && post.image_urls.length > 0 && (
              <div className="mt-2">
                {post.image_urls.length === 1 ? (
                  <Link
                    href={`/?fbid=${post.id}&set=pcb.${post.id}.0`}
                    className="block cursor-pointer"
                  >
                    <img 
                      src={post.image_urls[0]} 
                      alt="Post" 
                      className="w-full h-auto object-contain max-h-[600px]"
                      loading="lazy"
                    />
                  </Link>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {post.image_urls.slice(0, 4).map((img, idx) => (
                      <Link
                        key={idx}
                        href={`/?fbid=${post.id}&set=pcb.${post.id}.${idx}`}
                        className="relative bg-zinc-100 cursor-pointer block w-full aspect-square"
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
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

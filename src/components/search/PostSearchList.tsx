"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApi } from "@/components/contex/ApiProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ThumbsUp, MessageCircle, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import type { Post } from "@/types/post";

interface PostSearchListProps {
  keyword: string;
  limit?: number;
  onCountChange?: (count: number) => void;
}

interface PostWithEngagement extends Post {
  views_count?: number;
  engagement_score?: number;
}

const POSTS_PER_PAGE = 10;

export const PostSearchList: React.FC<PostSearchListProps> = ({ 
  keyword, 
  limit,
  onCountChange
}) => {
  const { api } = useApi();
  const [allPosts, setAllPosts] = useState<PostWithEngagement[]>([]); // All sorted posts
  const [displayedPosts, setDisplayedPosts] = useState<PostWithEngagement[]>([]); // Currently displayed posts
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (keyword?.trim()) {
      searchPosts(true);
    } else {
      setAllPosts([]);
      setDisplayedPosts([]);
      setCurrentPage(1);
      setHasMore(true);
      if (onCountChange) {
        onCountChange(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const loadViewCounts = useCallback(async (postIds: string[]) => {
    try {
      const counts = await Promise.all(
        postIds.map(async (postId) => {
          try {
            const response = await api.getPostViewCount(postId);
            return { postId, count: response.count || 0 };
          } catch {
            return { postId, count: 0 };
          }
        })
      );

      const countsMap: Record<string, number> = {};
      counts.forEach(({ postId, count }) => {
        countsMap[postId] = count;
      });

      setViewCounts((prev) => ({ ...prev, ...countsMap }));
      return countsMap;
    } catch (error) {
      console.error("Failed to load view counts:", error);
      return {};
    }
  }, [api]);

  const calculateEngagementScore = useCallback((post: Post, viewsCount: number = 0): number => {
    const likes = post.likes_count || 0;
    const comments = post.comments_count || 0;
    const views = viewsCount;
    // Engagement formula: (likes * 2) + (comments * 3) + (views * 1)
    return (likes * 2) + (comments * 3) + (views * 1);
  }, []);

  const searchPosts = useCallback(async (reset: boolean = false) => {
    if (!keyword?.trim()) {
      setAllPosts([]);
      setDisplayedPosts([]);
      if (onCountChange) {
        onCountChange(0);
      }
      setCurrentPage(1);
      setHasMore(true);
      return;
    }

    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }

      // Fetch a large batch to get all matching posts
      const fetchLimit = limit || 200; // Fetch more to get all results

      // Try searchPosts API first, fallback to getFeed if not available
      let response;
      try {
        response = await api.searchPosts(keyword, fetchLimit, 0) as any;
      } catch {
        // Fallback: get feed and filter by keyword
        response = await api.getFeed(200, 0, "popular") as any;
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

      // Load view counts for all posts
      const postIds = postsList.map((p) => p.id);
      const viewCountsMap = await loadViewCounts(postIds);

      // Calculate engagement score and add to posts
      const postsWithEngagement: PostWithEngagement[] = postsList.map((post) => {
        const viewsCount = viewCountsMap[post.id] || 0;
        const engagementScore = calculateEngagementScore(post, viewsCount);
        return {
          ...post,
          views_count: viewsCount,
          engagement_score: engagementScore,
        };
      });

      // Sort by engagement score (highest first)
      postsWithEngagement.sort((a, b) => {
        const scoreA = a.engagement_score || 0;
        const scoreB = b.engagement_score || 0;
        return scoreB - scoreA;
      });

      if (reset) {
        // Store all sorted posts
        setAllPosts(postsWithEngagement);
        
        // Show first page
        const firstPage = postsWithEngagement.slice(0, POSTS_PER_PAGE);
        setDisplayedPosts(firstPage);
        setCurrentPage(1);
        setHasMore(postsWithEngagement.length > POSTS_PER_PAGE);
        
        if (onCountChange) {
          onCountChange(postsWithEngagement.length);
        }
      }
    } catch (error: any) {
      console.error("Failed to search posts:", error);
      if (onCountChange && reset) {
        onCountChange(0);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [keyword, limit, api, loadViewCounts, calculateEngagementScore, onCountChange]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && allPosts.length > 0) {
      setLoadingMore(true);
      
      const nextPage = currentPage + 1;
      const startIndex = currentPage * POSTS_PER_PAGE;
      const endIndex = startIndex + POSTS_PER_PAGE;
      const nextPosts = allPosts.slice(startIndex, endIndex);
      
      if (nextPosts.length > 0) {
        setDisplayedPosts((prev) => [...prev, ...nextPosts]);
        setCurrentPage(nextPage);
        setHasMore(endIndex < allPosts.length);
      } else {
        setHasMore(false);
      }
      
      setLoadingMore(false);
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

  if (displayedPosts.length === 0 && !loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Tidak ada posts yang ditemukan
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedPosts.map((post) => {
        const likesCount = post.likes_count || 0;
        const commentsCount = post.comments_count || 0;
        const viewsCount = post.views_count || viewCounts[post.id] || 0;
        const engagementScore = post.engagement_score || calculateEngagementScore(post, viewsCount);

        return (
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
                  <div className="font-semibold text-sm cursor-pointer text-gray-900 dark:text-white">
                    <UserNameWithRole
                      displayName={post.user?.username || post.user?.full_name || "Unknown"}
                      role={(post.user as any)?.user_type ?? (post.user as any)?.role}
                      className="truncate inline-block max-w-full"
                    />
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

              {/* Engagement Metrics */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 mt-2">
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span>{likesCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{commentsCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{viewsCount}</span>
                  </div>
                  <div className="ml-auto text-xs text-gray-500 dark:text-gray-500">
                    Engagement: {engagementScore}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full md:w-auto"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Memuat...
              </>
            ) : (
              "Muat Lebih Banyak"
            )}
          </Button>
        </div>
      )}

      {!hasMore && displayedPosts.length > 0 && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          Semua hasil telah dimuat ({displayedPosts.length} dari {allPosts.length} posts)
        </div>
      )}
    </div>
  );
};

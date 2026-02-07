"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Image as ImageIcon,
  Video,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import PhotoModal from "@/components/ui/PhotoModal";
import { PostDialog } from "@/components/profile/organisms/PostDialog";
import { useApi } from "@/components/contex/ApiProvider";
import { CommentDialog } from "@/components/post/CommentDialog";
import { PostCard } from "@/components/post/PostCard";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Eye } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

import type { Post } from "@/types/post";
import type { Friendship } from "@/types/friendship";

interface FeedClientProps {
  posts: Post[];
}

const SCROLL_POSITION_KEY = "feed_scroll_position";

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

export default function FeedClient({ posts: initialPosts }: FeedClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { api } = useApi();
  const { toast } = useToast();
  const scrollRestoredRef = useRef(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [posts, setPosts] = useState<Post[]>(initialPosts || []);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState<Post | null>(null);
  const [postLikeCounts, setPostLikeCounts] = useState<Record<string, number>>({});
  const [postUserLikes, setPostUserLikes] = useState<Record<string, any>>({});
  const [postCommentCounts, setPostCommentCounts] = useState<Record<string, number>>({});
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set()); // Track viewed posts to prevent duplicates
  const [hasMore, setHasMore] = useState(true); // For infinite scroll
  const [loadingMore, setLoadingMore] = useState(false); // Loading state for infinite scroll
  const [currentOffset, setCurrentOffset] = useState(0); // Current offset for pagination
  const [currentSort, setCurrentSort] = useState<"newest" | "popular">("popular"); // Current sort mode
  const loadMoreRef = useRef<HTMLDivElement>(null); // Ref for infinite scroll trigger

  // Check URL params for photo modal
  const fbid = searchParams?.get('fbid');
  const set = searchParams?.get('set');
  
  // Parse URL params to determine selected post and image index
  useEffect(() => {
    if (fbid && set) {
      // Parse set parameter to get post ID and image index
      // Format: set=pcb.POST_ID.IMAGE_INDEX
      const setParts = set.split('.');
      if (setParts.length >= 2) {
        const postId = setParts[1];
        const imageIndex = setParts[2] ? parseInt(setParts[2]) : 0;
        
        // Find the post
        const post = posts.find(p => p.id === postId);
        if (post && post.image_urls && post.image_urls.length > 0) {
          // Only update if different to avoid unnecessary renders
          if (selectedPost?.id !== post.id || selectedImageIndex !== imageIndex) {
            setSelectedPost(post);
            setSelectedImageIndex(imageIndex);
          }
        }
      }
    } else {
      // Only update if currently has selected post
      if (selectedPost) {
        setSelectedPost(null);
        setSelectedImageIndex(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbid, set, posts]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (!fbid && !set) {
        setSelectedPost(null);
        setSelectedImageIndex(0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fbid, set]);

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

  // Handle image click - update URL without reload
  const handleImageClick = (post: Post, imageIndex: number) => {
    // Save scroll position
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    sessionStorage.setItem(SCROLL_POSITION_KEY, scrollPosition.toString());
    
    // Update URL with query params (like Facebook: /photo/?fbid=...&set=pcb.POST_ID.IMAGE_INDEX)
    const newUrl = `/?fbid=${post.id}&set=pcb.${post.id}.${imageIndex}`;
    router.push(newUrl, { scroll: false });
  };

  // Handle modal close - restore URL
  const handleCloseModal = () => {
    // Remove query params and restore original URL
    router.push('/', { scroll: false });
    setSelectedPost(null);
    setSelectedImageIndex(0);
  };

  // Handle image navigation in modal
  const handleNavigateImage = (direction: 'prev' | 'next') => {
    if (!selectedPost || !selectedPost.image_urls) return;
    
    const totalImages = selectedPost.image_urls.length;
    let newIndex = selectedImageIndex;
    
    if (direction === 'prev' && selectedImageIndex > 0) {
      newIndex = selectedImageIndex - 1;
    } else if (direction === 'next' && selectedImageIndex < totalImages - 1) {
      newIndex = selectedImageIndex + 1;
    }
    
    if (newIndex !== selectedImageIndex) {
      setSelectedImageIndex(newIndex);
      // Update URL
      const newUrl = `/?fbid=${selectedPost.id}&set=pcb.${selectedPost.id}.${newIndex}`;
      router.push(newUrl, { scroll: false });
    }
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

  const loadFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);
      const response = await api.getFriends() as any;
      // API client unwraps data, so response is { friends: [...] } or { data: { friends: [...] } }
      // Handle both wrapped and unwrapped responses
      let friendsList: typeof friends = [];
      
      if (Array.isArray(response)) {
        // If response is directly an array
        friendsList = response;
      } else if (response && typeof response === 'object') {
        // Check for friends property
        if ('friends' in response && Array.isArray(response.friends)) {
          friendsList = response.friends;
        } else if ('data' in response && response.data && typeof response.data === 'object') {
          const data = response.data;
          if ('friends' in data && Array.isArray(data.friends)) {
            friendsList = data.friends;
          } else if ('friendships' in data && Array.isArray(data.friendships)) {
            friendsList = data.friendships;
          }
        } else if ('friendships' in response && Array.isArray(response.friendships)) {
          friendsList = response.friendships;
        }
      }
      
      setFriends(friendsList);
    } catch (error) {
      console.error("Failed to load friends:", error);
    } finally {
      setLoadingFriends(false);
    }
  }, [api]);

  // Load friends list
  useEffect(() => {
    if (session?.user?.id) {
      loadFriends();
    }
  }, [session?.user?.id, loadFriends]);

  // Listen for friendship changes to refresh friends list
  useEffect(() => {
    const handleFriendshipChanged = () => {
      // Add a small delay to ensure backend has updated the database
      setTimeout(() => {
        if (session?.user?.id) {
          loadFriends();
        }
      }, 500);
    };

    window.addEventListener('friendship-changed', handleFriendshipChanged);
    
    return () => {
      window.removeEventListener('friendship-changed', handleFriendshipChanged);
    };
  }, [session?.user?.id, loadFriends]);

  // Update posts when initialPosts changes
  useEffect(() => {
    if (initialPosts && Array.isArray(initialPosts)) {
      setPosts(initialPosts);
    }
  }, [initialPosts]);

  // Load like and comment counts for posts (only if not already in post data)
  const loadPostEngagements = useCallback(async () => {
    if (posts.length === 0) return;

    // First, use counts from post data if available (from backend)
    const likeCounts: Record<string, number> = {};
    const commentCounts: Record<string, number> = {};
    const userLikes: Record<string, any> = {};

    // Extract counts from post data if available
    posts.forEach((post) => {
      if (post.likes_count !== undefined) {
        likeCounts[post.id] = post.likes_count;
      }
      if (post.comments_count !== undefined) {
        commentCounts[post.id] = post.comments_count;
      }
      if (post.user_liked !== undefined && post.user_liked) {
        userLikes[post.id] = { user_id: session?.user?.id, post_id: post.id };
      }
    });

    // Only fetch counts for posts that don't have them
    const postsNeedingCounts = posts.filter(
      (post) => post.likes_count === undefined || post.comments_count === undefined
    );

    if (postsNeedingCounts.length > 0) {
      try {
        const engagements = await Promise.all(
          postsNeedingCounts.map(async (post) => {
            try {
              const [likeCountRes, commentCountRes] = await Promise.all([
                api.getLikeCount("post", post.id).catch(() => ({ count: 0 })),
                api.getCommentCount(post.id).catch(() => ({ count: 0 })),
              ]);

              return {
                postId: post.id,
                likeCount: likeCountRes.count || 0,
                commentCount: commentCountRes.count || 0,
              };
            } catch {
              return {
                postId: post.id,
                likeCount: 0,
                commentCount: 0,
              };
            }
          })
        );

        engagements.forEach((eng) => {
          likeCounts[eng.postId] = eng.likeCount;
          commentCounts[eng.postId] = eng.commentCount;
        });
      } catch (error) {
        console.error("Failed to load post engagements:", error);
      }
    }

      setPostLikeCounts(likeCounts);
      setPostCommentCounts(commentCounts);
      setPostUserLikes(userLikes);
  }, [posts, api, session?.user?.id]);

  useEffect(() => {
    if (posts.length > 0) {
      loadPostEngagements();
    }
  }, [posts.length, loadPostEngagements]);

  const handleOpenCommentDialog = (post: Post) => {
    setSelectedPostForComment(post);
    setCommentDialogOpen(true);
  };

  const handleCloseCommentDialog = () => {
    setCommentDialogOpen(false);
    setSelectedPostForComment(null);
    loadPostEngagements(); // Reload counts after closing
  };

  const handleLikeChange = useCallback((postId: string, liked: boolean, likeCount: number) => {
    setPostLikeCounts((prev) => ({ ...prev, [postId]: likeCount }));
  }, []);

  // Handle post creation success
  const handlePostSuccess = async () => {
    try {
      // Reset and reload feed with popular sorting (new post will appear based on engagement)
      await loadFeed("popular", true);
    } catch (err) {
      console.error("Failed to refresh posts:", err);
    }
  };
  
  // Load view counts for posts
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

      return countsMap;
    } catch (error) {
      console.error("Failed to load view counts:", error);
      return {};
    }
  }, [api]);

  // Load feed with sorting option (for initial load or refresh)
  const loadFeed = useCallback(async (sort: "newest" | "popular" = "popular", reset: boolean = true) => {
    try {
      const offset = reset ? 0 : currentOffset;
      const response = await api.getFeed(50, offset, sort);
      
      // Handle different response structures
      let feedPosts: Post[] = [];
      if (response.data?.posts && Array.isArray(response.data.posts)) {
        feedPosts = response.data.posts;
      } else if (response.posts && Array.isArray(response.posts)) {
        feedPosts = response.posts;
      } else if (Array.isArray(response)) {
        feedPosts = response;
      }

      // If sorting by popular, ensure posts are sorted by engagement
      if (sort === "popular" && feedPosts.length > 0) {
        // Load view counts for all posts
        const postIds = feedPosts.map((p) => p.id);
        const viewCountsMap = await loadViewCounts(postIds);

        // Sort by engagement score (highest first)
        // Use post data directly (likes_count, comments_count) or fallback to state
        feedPosts.sort((a, b) => {
          const likesA = a.likes_count ?? postLikeCounts[a.id] ?? 0;
          const commentsA = a.comments_count ?? postCommentCounts[a.id] ?? 0;
          const viewsA = viewCountsMap[a.id] || 0;
          const scoreA = (likesA * 2) + (commentsA * 3) + (viewsA * 1);

          const likesB = b.likes_count ?? postLikeCounts[b.id] ?? 0;
          const commentsB = b.comments_count ?? postCommentCounts[b.id] ?? 0;
          const viewsB = viewCountsMap[b.id] || 0;
          const scoreB = (likesB * 2) + (commentsB * 3) + (viewsB * 1);

          return scoreB - scoreA;
        });
      }
      
      if (reset) {
        setPosts(feedPosts);
        setCurrentOffset(feedPosts.length);
        setHasMore(feedPosts.length >= 50);
      } else {
        // Append for infinite scroll
        setPosts(prev => [...prev, ...feedPosts]);
        setCurrentOffset(prev => prev + feedPosts.length);
        setHasMore(feedPosts.length >= 50);
      }
      
      setCurrentSort(sort);
    } catch (err) {
      console.error("Failed to load feed:", err);
      setHasMore(false);
    }
  }, [api, currentOffset, loadViewCounts, postLikeCounts, postCommentCounts]);

  // Load more posts for infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const response = await api.getFeed(50, currentOffset, currentSort);
      
      let feedPosts: Post[] = [];
      if (response.data?.posts && Array.isArray(response.data.posts)) {
        feedPosts = response.data.posts;
      } else if (response.posts && Array.isArray(response.posts)) {
        feedPosts = response.posts;
      } else if (Array.isArray(response)) {
        feedPosts = response;
      }

      // If sorting by popular, ensure posts are sorted by engagement
      if (currentSort === "popular" && feedPosts.length > 0) {
        // Load view counts for new posts
        const postIds = feedPosts.map((p) => p.id);
        const viewCountsMap = await loadViewCounts(postIds);

        // Sort by engagement score (highest first)
        // Use post data directly (likes_count, comments_count) or fallback to state
        feedPosts.sort((a, b) => {
          const likesA = a.likes_count ?? postLikeCounts[a.id] ?? 0;
          const commentsA = a.comments_count ?? postCommentCounts[a.id] ?? 0;
          const viewsA = viewCountsMap[a.id] || 0;
          const scoreA = (likesA * 2) + (commentsA * 3) + (viewsA * 1);

          const likesB = b.likes_count ?? postLikeCounts[b.id] ?? 0;
          const commentsB = b.comments_count ?? postCommentCounts[b.id] ?? 0;
          const viewsB = viewCountsMap[b.id] || 0;
          const scoreB = (likesB * 2) + (commentsB * 3) + (viewsB * 1);

          return scoreB - scoreA;
        });
      }
      
      if (feedPosts.length > 0) {
        setPosts(prev => [...prev, ...feedPosts]);
        setCurrentOffset(prev => prev + feedPosts.length);
        setHasMore(feedPosts.length >= 50);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more posts:", err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [api, currentOffset, currentSort, loadingMore, hasMore, loadViewCounts, postLikeCounts, postCommentCounts]);

  useWebSocketSubscription((data: any) => {
    let messageData: any;
    if (data.type === "notification" && data.payload) {
      messageData = data.payload;
    } else {
      messageData = data;
    }

    if (messageData.type === "post_upload_pending") {
      toast({
        title: "Upload Dimulai",
        description: messageData.message || "Post sedang diproses, gambar sedang diupload...",
      });
    } else if (
      messageData.type === "post_upload_completed" ||
      (messageData.type === "notification" && messageData.payload?.type === "post_upload_completed")
    ) {
      const notification = messageData.type === "notification" ? messageData.payload : messageData;
      let postID: string | null = notification.target_id || null;
      if (!postID && notification.data) {
        try {
          const parsed = typeof notification.data === "string" ? JSON.parse(notification.data) : notification.data;
          postID = parsed?.post_id || null;
        } catch {
          // ignore
        }
      }
      const action = postID ? (
        <ToastAction
          altText="Lihat Post"
          onClick={() => {
            router.push(`/?fbid=${postID}&set=pcb.${postID}.0`);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          Lihat Post
        </ToastAction>
      ) : undefined;
      toast({
        title: notification.title || "Upload Selesai",
        description: notification.message || `Post berhasil diupload dengan ${notification.data?.image_count || 0} gambar`,
        action,
      });
      handlePostSuccess();
    }
  });

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // Initialize feed with popular sorting directly (no delay)
  useEffect(() => {
    if (session?.user?.id && initialPosts && initialPosts.length > 0) {
      // Use initial posts (already sorted by popular from server-side)
      setPosts(initialPosts);
      setCurrentOffset(initialPosts.length);
      setHasMore(initialPosts.length >= 50);
      setCurrentSort("popular");
    } else if (session?.user?.id && (!posts || posts.length === 0)) {
      // If no initial posts, load with popular sorting directly
      loadFeed("popular", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, initialPosts?.length]);

  // Handle case when posts is undefined (during build/prerender)
  if (!posts || !Array.isArray(posts)) {
    return null;
  }

  return (
    <AppLayout
      friends={friends}
      loadingFriends={loadingFriends}
      showCreatePost={true}
      onCreatePostClick={() => setIsPostDialogOpen(true)}
    >
      {/* Create Post Widget */}
      {session && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-4 mb-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={session.user?.image || ''} />
                <AvatarFallback>{session.user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => setIsPostDialogOpen(true)}
                className="flex-1 w-full h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center px-4 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-left"
              >
                Apa yang Anda pikirkan, {session.user?.name?.split(' ')[0]}?
              </button>
            </div>
            <Separator className="mb-4" />
            <div className="flex justify-between px-4">
              <Button variant="ghost" className="flex-1 gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                <Video className="w-6 h-6" />
                <span className="hidden sm:inline">Video Langsung</span>
              </Button>
              <Button 
                variant="ghost" 
                className="flex-1 gap-2 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                onClick={() => setIsPostDialogOpen(true)}
              >
                <ImageIcon className="w-6 h-6" />
                <span className="hidden sm:inline">Foto/Video</span>
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
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                session={session}
                api={api}
                viewedPosts={viewedPosts}
                setViewedPosts={setViewedPosts}
                postLikeCounts={postLikeCounts}
                postUserLikes={postUserLikes}
                postCommentCounts={postCommentCounts}
                handleLikeChange={handleLikeChange}
                handleOpenCommentDialog={handleOpenCommentDialog}
                handleImageClick={handleImageClick}
                onPostDeleted={(postId) => {
                  // Remove deleted post from list
                  setPosts((prev) => prev.filter((p) => p.id !== postId));
                }}
              />
            ))}
            
            {/* Infinite Scroll Trigger */}
            {hasMore && (
              <div 
                ref={loadMoreRef}
                className="h-20 flex items-center justify-center"
              >
                {loadingMore && (
                  <div className="text-zinc-500 text-sm">Memuat post lainnya...</div>
                )}
              </div>
            )}
            
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                <p>Semua post telah dimuat</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-zinc-500">
            <p>No posts available</p>
          </div>
        )}
      </div>

      {/* Photo Modal */}
      {selectedPost && (
        <PhotoModal
          isOpen={!!selectedPost}
          onClose={handleCloseModal}
          post={selectedPost}
          imageIndex={selectedImageIndex}
          onNavigateImage={handleNavigateImage}
        />
      )}

      {/* Post Dialog */}
      {session?.user && (
        <PostDialog
          open={isPostDialogOpen}
          onClose={() => setIsPostDialogOpen(false)}
          onSuccess={handlePostSuccess}
          userId={session.user.id || ''}
        />
      )}

      {/* Comment Dialog */}
      <CommentDialog
        open={commentDialogOpen}
        onClose={handleCloseCommentDialog}
        post={selectedPostForComment}
        onCommentCountChange={(count) => {
          if (selectedPostForComment) {
            setPostCommentCounts((prev) => ({
              ...prev,
              [selectedPostForComment.id]: count,
            }));
          }
        }}
      />
    </AppLayout>
  );
}
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import { useWebSocket } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Eye } from "lucide-react";

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

  // Load friends list
  useEffect(() => {
    if (session?.user?.id) {
      loadFriends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      const response = await api.getFriends();
      const friendsList = response.data?.friends || response.data?.friendships || [];
      setFriends(friendsList);
    } catch (error) {
      console.error("Failed to load friends:", error);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Update posts when initialPosts changes
  useEffect(() => {
    if (initialPosts && Array.isArray(initialPosts)) {
      setPosts(initialPosts);
    }
  }, [initialPosts]);

  // Load like and comment counts for posts
  const loadPostEngagements = useCallback(async () => {
    if (posts.length === 0) return;

    try {
      const engagements = await Promise.all(
        posts.map(async (post) => {
          try {
            const [likeCountRes, commentCountRes, likesRes] = await Promise.all([
              api.getLikeCount("post", post.id),
              api.getCommentCount(post.id),
              api.getLikes("post", post.id, 100, 0).catch(() => ({ likes: [] })),
            ]);

            // Check if current user has liked this post
            const userId = session?.user?.id;
            const userLike = likesRes.likes?.find(
              (like: any) => like.user_id === userId
            ) || null;

            return {
              postId: post.id,
              likeCount: likeCountRes.count || 0,
              commentCount: commentCountRes.count || 0,
              userLike,
            };
          } catch {
            return {
              postId: post.id,
              likeCount: 0,
              commentCount: 0,
              userLike: null,
            };
          }
        })
      );

      const likeCounts: Record<string, number> = {};
      const commentCounts: Record<string, number> = {};
      const userLikes: Record<string, any> = {};

      engagements.forEach((eng) => {
        likeCounts[eng.postId] = eng.likeCount;
        commentCounts[eng.postId] = eng.commentCount;
        if (eng.userLike) {
          userLikes[eng.postId] = eng.userLike;
        }
      });

      setPostLikeCounts(likeCounts);
      setPostCommentCounts(commentCounts);
      setPostUserLikes(userLikes);
    } catch (error) {
      console.error("Failed to load post engagements:", error);
    }
  }, [posts, api, session]);

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
  }, [api, currentOffset]);

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
  }, [api, currentOffset, currentSort, loadingMore, hasMore]);

  // WebSocket connection for realtime post upload notifications
  // Use useMemo to prevent URL from changing on every render
  const wsUrlString = useMemo(() => {
    if (typeof window === "undefined") return "";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const wsUrl = apiUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${wsUrl}/ws`;
  }, []);

  useWebSocket(wsUrlString, {
    onMessage: (data: any) => {
      // Handle WebSocket message format
      // Backend sends: { type: "notification", payload: {...} }
      let messageData: any;
      if (data.type === "notification" && data.payload) {
        messageData = data.payload;
      } else {
        messageData = data;
      }

      // Handle post upload notifications
      // For pending: direct WebSocket message (not saved to DB)
      if (messageData.type === "post_upload_pending") {
        toast({
          title: "Upload Dimulai",
          description: messageData.message || "Post sedang diproses, gambar sedang diupload...",
        });
      } 
      // For completed: notification from DB (saved notification)
      else if (messageData.type === "post_upload_completed" || 
               (messageData.type === "notification" && messageData.payload?.type === "post_upload_completed")) {
        const notification = messageData.type === "notification" ? messageData.payload : messageData;
        
        // Get post_id from notification data or target_id
        let postID: string | null = notification.target_id || null;
        if (!postID && notification.data) {
          try {
            const data = typeof notification.data === 'string' 
              ? JSON.parse(notification.data) 
              : notification.data;
            postID = data?.post_id || null;
          } catch {
            // Ignore parse errors
          }
        }
        
        // Create action button if post_id is available
        const action = postID ? (
          <ToastAction
            altText="Lihat Post"
            onClick={() => {
              // Navigate to feed with photo modal format: /?fbid=POST_ID&set=pcb.POST_ID.0
              const redirectUrl = `/?fbid=${postID}&set=pcb.${postID}.0`;
              router.push(redirectUrl);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            Lihat Post
          </ToastAction>
        ) : undefined;
        
        toast({
          title: notification.title || "Upload Selesai",
          description: notification.message || `Post berhasil diupload dengan ${notification.data?.image_count || 0} gambar`,
          action: action,
        });
        
        // Refresh posts to show the newly uploaded post with images
        handlePostSuccess();
      }
    },
    onError: (err) => {
      console.error("WebSocket error in FeedClient:", err);
    },
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
                {loadingFriends ? (
                  <div className="text-center py-4 text-zinc-500 text-sm">Memuat kontak...</div>
                ) : friends.length > 0 ? (
                  friends.slice(0, 10).map((friendship) => {
                    // Determine which user is the friend (not the current user)
                    const friend = session?.user?.id === friendship.sender_id 
                      ? friendship.receiver 
                      : friendship.sender;
                    
                    if (!friend) return null;
                    
                    const getInitials = (name?: string) => {
                      if (!name) return 'U';
                      return name
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);
                    };

                    return (
                      <Link
                        key={friendship.id}
                        href={`/profile/${friend.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                      >
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={friend.profile_photo || ''} />
                            <AvatarFallback>{getInitials(friend.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900"></div>
                        </div>
                        <div className="font-medium text-sm">{friend.full_name || friend.username || 'Unknown'}</div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-zinc-500 text-sm">Belum ada kontak</div>
                )}
              </div>
            </div>
          </div>

        </div>
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
    </div>
  );
}
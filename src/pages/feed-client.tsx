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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { PostDialog } from "@/components/profile/organisms/PostDialog";
import { useApi } from "@/components/contex/ApiProvider";
import { CommentDialog } from "@/components/post/CommentDialog";
import { PostCard } from "@/components/post/PostCard";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Eye } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChat } from "@/contexts/ChatContext";

import type { Post } from "@/types/post";
import type { Friendship } from "@/types/friendship";

interface FeedClientProps {
  posts: Post[];
}

const SCROLL_POSITION_KEY = "feed_scroll_position";
/** Jumlah post per request agar feed menampilkan lebih banyak data (sama seperti search) */
const FEED_PAGE_SIZE = 100;

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
  /** Index di daftar media gabungan (gambar + video) untuk PhotoModal detail */
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
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
  const { openChat } = useChat();

  // Check URL params for photo modal
  const fbid = searchParams?.get('fbid');
  const set = searchParams?.get('set');
  
  // Parse URL params: selected post + media index (gambar + video digabung)
  useEffect(() => {
    if (fbid && set) {
      const setParts = set.split('.');
      if (setParts.length >= 2) {
        const postId = setParts[1];
        const mediaIndex = setParts[2] ? parseInt(setParts[2], 10) : 0;
        const post = posts.find((p) => p.id === postId);
        const totalMedia = (post?.image_urls?.length || 0) + (post?.video_urls?.length || 0);
        if (post && totalMedia > 0 && mediaIndex >= 0 && mediaIndex < totalMedia) {
          if (selectedPost?.id !== post.id || selectedMediaIndex !== mediaIndex) {
            setSelectedPost(post);
            setSelectedMediaIndex(mediaIndex);
          }
        }
      }
    } else {
      if (selectedPost) {
        setSelectedPost(null);
        setSelectedMediaIndex(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbid, set, posts]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (!fbid && !set) {
        setSelectedPost(null);
        setSelectedMediaIndex(0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fbid, set]);

  const updateMediaUrl = useCallback((postId: string, mediaIndex: number) => {
    const newUrl = `/?fbid=${postId}&set=pcb.${postId}.${mediaIndex}`;
    router.push(newUrl, { scroll: false });
  }, [router]);

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

  // Video klik: buka detail di PhotoModal (media index = gambar dulu, lalu video)
  const handleVideoClick = (post: Post, videoIndex: number) => {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    sessionStorage.setItem(SCROLL_POSITION_KEY, scrollPosition.toString());
    const mediaIndex = (post.image_urls?.length || 0) + videoIndex;
    setSelectedPost(post);
    setSelectedMediaIndex(mediaIndex);
    updateMediaUrl(post.id, mediaIndex);
  };

  // Klik gambar: buka detail di PhotoModal (media index = index gambar)
  const handleImageClick = (post: Post, imageIndex: number) => {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    sessionStorage.setItem(SCROLL_POSITION_KEY, scrollPosition.toString());
    setSelectedPost(post);
    setSelectedMediaIndex(imageIndex);
    updateMediaUrl(post.id, imageIndex);
  };

  const handleCloseModal = () => {
    router.push('/', { scroll: false });
    setSelectedPost(null);
    setSelectedMediaIndex(0);
  };

  // Navigasi prev/next di PhotoModal (daftar media = gambar + video)
  const handleNavigateImage = (direction: 'prev' | 'next') => {
    if (!selectedPost) return;
    const totalMedia = (selectedPost.image_urls?.length || 0) + (selectedPost.video_urls?.length || 0);
    let newIndex = selectedMediaIndex;
    if (direction === 'prev' && selectedMediaIndex > 0) newIndex = selectedMediaIndex - 1;
    else if (direction === 'next' && selectedMediaIndex < totalMedia - 1) newIndex = selectedMediaIndex + 1;
    if (newIndex !== selectedMediaIndex) {
      setSelectedMediaIndex(newIndex);
      updateMediaUrl(selectedPost.id, newIndex);
    }
  };

  const handleNavigateToIndex = (index: number) => {
    if (!selectedPost) return;
    setSelectedMediaIndex(index);
    updateMediaUrl(selectedPost.id, index);
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

  // Update posts when initialPosts changes; keep real-time prepended posts (e.g. own new post) at top
  useEffect(() => {
    if (!initialPosts || !Array.isArray(initialPosts)) return;
    setPosts((prev) => {
      const initialIds = new Set(initialPosts.map((p: Post) => p.id));
      const onlyInPrev = prev.filter((p) => !initialIds.has(p.id));
      if (onlyInPrev.length === 0) return initialPosts;
      return [...onlyInPrev, ...initialPosts];
    });
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

  // Single source of truth: update both like count and current user's like state
  // so LikeButton shows active (filled) when user has already liked the post.
  // Store null for explicit "unliked" so client state overrides server post.user_liked after unlike.
  const handleLikeChange = useCallback((postId: string, liked: boolean, likeCount: number) => {
    setPostLikeCounts((prev) => ({ ...prev, [postId]: likeCount }));
    setPostUserLikes((prev) => {
      if (liked && session?.user?.id) {
        return { ...prev, [postId]: { user_id: session.user.id, post_id: postId } };
      }
      return { ...prev, [postId]: null };
    });
  }, [session?.user?.id]);

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
      const response = await api.getFeed(FEED_PAGE_SIZE, offset, sort);
      
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
        setHasMore(feedPosts.length >= FEED_PAGE_SIZE);
      } else {
        // Append for infinite scroll
        setPosts(prev => [...prev, ...feedPosts]);
        setCurrentOffset(prev => prev + feedPosts.length);
        setHasMore(feedPosts.length >= FEED_PAGE_SIZE);
      }
      
      setCurrentSort(sort);
    } catch (err) {
      console.error("Failed to load feed:", err);
      setHasMore(false);
    }
  }, [api, currentOffset, loadViewCounts, postLikeCounts, postCommentCounts]);

  // Handle post creation success (optional post = from upload 202, show immediately)
  const handlePostSuccess = useCallback(
    async (newPost?: Post) => {
      if (newPost?.id) {
        setPosts((prev) => {
          if (prev.some((p) => p.id === newPost.id)) return prev;
          return [newPost, ...prev];
        });
        return;
      }
      try {
        await loadFeed("popular", true);
      } catch (err) {
        console.error("Failed to refresh posts:", err);
      }
    },
    [loadFeed]
  );

  // Load more posts for infinite scroll
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const response = await api.getFeed(FEED_PAGE_SIZE, currentOffset, currentSort);
      
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
        setHasMore(feedPosts.length >= FEED_PAGE_SIZE);
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

  // Prepend a finished post to feed (fetches full data from API)
  const prependNewPost = useCallback(
    async (postId: string) => {
      if (!postId) return;
      try {
        const res = await api.getPost(postId) as any;
        const post: Post =
          res?.data?.post ?? res?.post ?? res?.data ?? res;
        if (!post?.id) return;
        setPosts((prev) => {
          // Don't add if images haven't been processed yet (empty image_urls)
          const idx = prev.findIndex((p) => p.id === post.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = post;
            return next;
          }
          return [post, ...prev];
        });
      } catch {
        // ignore fetch error
      }
    },
    [api]
  );

  useWebSocketSubscription((data: any) => {
    // Unwrap hub wrapper: notification → data.payload, broadcast → data.payload
    let messageData: any;
    if (data.type === "notification" && data.payload) {
      messageData = data.payload;
    } else if (data.type === "broadcast" && data.payload) {
      messageData = data.payload;
    } else {
      messageData = data;
    }

    // --- new_post: broadcast when upload finishes → prepend post + toast for creator ---
    if (messageData.type === "new_post" && messageData.post_id) {
      const postId = messageData.post_id as string;
      // Fetch and prepend, then show toast if it's the creator's own post
      (async () => {
        try {
          const res = await api.getPost(postId) as any;
          const post: Post = res?.data?.post ?? res?.post ?? res?.data ?? res;
          if (!post?.id) return;
          setPosts((prev) => {
            const idx = prev.findIndex((p) => p.id === post.id);
            if (idx >= 0) { const next = [...prev]; next[idx] = post; return next; }
            return [post, ...prev];
          });
          // Show toast for own post
          const isOwn = session?.user?.id &&
            (post.user_id === session.user.id || (post.user as any)?.id === session.user.id);
          if (isOwn) {
            const imageCount = post.image_urls?.length ?? 0;
            const videoCount = post.video_urls?.length ?? 0;
            const mediaParts: string[] = [];
            if (imageCount > 0) mediaParts.push(`${imageCount} gambar`);
            if (videoCount > 0) mediaParts.push(`${videoCount} video`);
            toast({
              title: "Upload Selesai",
              description: mediaParts.length > 0
                ? `Post berhasil diupload dengan ${mediaParts.join(" dan ")}`
                : "Post berhasil diupload",
              action: (
                <ToastAction
                  altText="Lihat Post"
                  onClick={() => router.push(`/?fbid=${post.id}&set=pcb.${post.id}.0`)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Lihat Post
                </ToastAction>
              ),
            });
          }
        } catch { /* ignore */ }
      })();
      return;
    }

    // --- post_upload_pending: show "processing" toast ---
    if (messageData.type === "post_upload_pending") {
      toast({
        title: "Upload Dimulai",
        description: messageData.message || "Post sedang diproses, gambar sedang diupload...",
      });
      return;
    }

    // --- post_upload_completed: toast + prepend (sent only to creator) ---
    if (messageData.type === "post_upload_completed") {
      const dataObj =
        messageData.data && typeof messageData.data === "object"
          ? messageData.data
          : typeof messageData.data === "string"
            ? (() => { try { return JSON.parse(messageData.data); } catch { return null; } })()
            : null;
      const postID: string | null =
        (messageData.target_id as string) ||
        (dataObj?.post_id as string) ||
        null;
      const imageCount = typeof dataObj?.image_count === "number" ? dataObj.image_count : 0;
      toast({
        title: messageData.title || "Upload Selesai",
        description: messageData.message || `Post berhasil diupload dengan ${imageCount} gambar`,
        action: postID ? (
          <ToastAction altText="Lihat Post" onClick={() => router.push(`/?fbid=${postID}&set=pcb.${postID}.0`)}>
            <Eye className="h-4 w-4 mr-1" />
            Lihat Post
          </ToastAction>
        ) : undefined,
      });
      if (postID) prependNewPost(postID);
      return;
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
      setPosts((prev) => {
        const initialIds = new Set(initialPosts.map((p: Post) => p.id));
        const onlyInPrev = prev.filter((p) => !initialIds.has(p.id));
        if (onlyInPrev.length === 0) return initialPosts;
        return [...onlyInPrev, ...initialPosts];
      });
      setCurrentOffset(initialPosts.length);
      setHasMore(initialPosts.length >= FEED_PAGE_SIZE);
      setCurrentSort("popular");
    } else if (session?.user?.id && (!posts || posts.length === 0)) {
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
      onChatClick={(user) => openChat(user)}
    >
      {/* Create Post Widget */}
      {session && (
        <Card className="border-none shadow-sm py-0">
          <CardContent className="p-4">
            <div className="flex gap-4 mb-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={session.user?.image || ''} />
                <AvatarFallback>{session.user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => setIsPostDialogOpen(true)}
                className="flex-1 w-full h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center px-4 text-sm md:text-base text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-left"
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
                handleVideoClick={handleVideoClick}
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

      {/* PhotoModal: detail gambar + video (satu daftar media), sidebar caption & komentar */}
      {selectedPost && (
        <PhotoModal
          isOpen={!!selectedPost}
          onClose={handleCloseModal}
          post={selectedPost}
          imageIndex={selectedMediaIndex}
          onNavigateImage={handleNavigateImage}
          onNavigateToIndex={handleNavigateToIndex}
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
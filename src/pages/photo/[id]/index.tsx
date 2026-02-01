"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import PhotoViewer from "./photo-viewer";
import { useApi } from "@/components/contex/ApiProvider";
import type { Post } from "@/types/post";
import { Loader2 } from "lucide-react";

export default function PhotoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { api } = useApi();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const postId = params?.id as string;
  const imageIndex = searchParams?.get("index") ? parseInt(searchParams.get("index")!) : 0;

  useEffect(() => {
    if (postId) {
      loadPost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getPost(postId);
      const postData = response.post || response.data?.post;
      if (!postData) {
        setError("Post not found");
        return;
      }
      setPost(postData);
    } catch (err: any) {
      console.error("Failed to load post:", err);
      setError(err.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full bg-black items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex h-screen w-full bg-black items-center justify-center">
        <div className="text-white text-center">
          <p className="text-lg font-semibold mb-2">Post tidak ditemukan</p>
          <p className="text-sm text-gray-300">{error || "Post tidak tersedia"}</p>
        </div>
      </div>
    );
  }

  if (!post.image_urls || !post.image_urls[imageIndex]) {
    return (
      <div className="flex h-screen w-full bg-black items-center justify-center">
        <div className="text-white text-center">
          <p className="text-lg font-semibold">Gambar tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return <PhotoViewer post={post} imageIndex={imageIndex} />;
}

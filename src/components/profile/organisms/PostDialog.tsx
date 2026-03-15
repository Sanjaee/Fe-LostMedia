"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/components/contex/ApiProvider";
import { X, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Post, CreatePostRequest, UpdatePostRequest } from "@/types/post";
import Image from "next/image";

interface PostDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newPost?: Post) => void;
  post?: Post | null; // If provided, it's edit mode
  userId: string;
  groupId?: string; // If provided, post will be created in this group
}

export const PostDialog: React.FC<PostDialogProps> = ({
  open,
  onClose,
  onSuccess,
  post,
  userId, // eslint-disable-line @typescript-eslint/no-unused-vars
  groupId,
}) => {
  const { toast } = useToast();
  const { api } = useApi();
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFiles, setImageFiles] = useState<File[]>([]); // Store File objects
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // Local preview URLs from File objects
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]); // Existing URLs from edit mode
  const [videoFiles, setVideoFiles] = useState<File[]>([]); // Store video File objects
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]); // Local preview URLs for videos
  const [formData, setFormData] = useState<CreatePostRequest>({
    content: "",
    image_urls: [],
  });

  const isEditMode = !!post;
  const MAX_IMAGES = 10;
  const MAX_VIDEOS = 5;
  const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB

  /** Detect video URL from extension (for manual URL: show video vs image) */
  const isVideoUrl = (url: string): boolean => {
    if (!url || typeof url !== "string") return false;
    const path = url.split("?")[0].toLowerCase();
    return /\.(mp4|mov|avi|webm|mkv|3gp)(\?|$)/i.test(path);
  };

  useEffect(() => {
    if (post && open) {
      const combinedMediaUrls = [...(post.image_urls || []), ...(post.video_urls || [])];
      setFormData({
        content: post.content || "",
        image_urls: combinedMediaUrls.length > 0 ? [...combinedMediaUrls, ""] : [],
        is_pinned: post.is_pinned,
      });
      setExistingImageUrls(post.image_urls || []);
      setImagePreviews(combinedMediaUrls.length > 0 ? combinedMediaUrls : []);
      setImageFiles([]);
      setVideoFiles([]);
      setVideoPreviews([]);
    } else if (open) {
      setFormData({
        content: "",
        image_urls: [],
        group_id: groupId,
      });
      setExistingImageUrls([]);
      setImagePreviews([]);
      setImageFiles([]);
      setVideoFiles([]);
      setVideoPreviews([]);
    }
  }, [post, open]);

  // Cleanup preview URLs when component unmounts
  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
      videoPreviews.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasImages = imageFiles.length > 0;
    const hasVideos = videoFiles.length > 0;
    const hasMedia = hasImages || hasVideos;
    if (!hasMedia && !(formData.content?.trim())) {
      toast({
        title: "Content or media required",
        description: "Add text or image/video.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    try {
      if (isEditMode && post) {
        const manualUrls = formData.image_urls?.filter(url => url?.trim() && !url.startsWith("blob:")) || [];
        const finalImageUrls = manualUrls.filter(url => !isVideoUrl(url));
        const finalVideoUrls = manualUrls.filter(url => isVideoUrl(url));

        const updateData: UpdatePostRequest = {
          content: formData.content?.trim() || undefined,
          image_urls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
          video_urls: finalVideoUrls.length > 0 ? finalVideoUrls : undefined,
          is_pinned: formData.is_pinned,
        };
        await api.updatePost(post.id, updateData);
        toast({ title: "Success", description: "Post updated successfully" });
        onSuccess();
      } else {
        if (hasImages && hasVideos) {
          await api.createPostWithMedia(
            formData.content?.trim(),
            imageFiles,
            videoFiles,
            formData.group_id
          );
          toast({
            title: "Processing",
            description: "Post created. Images & video are uploading...",
            variant: "pending",
          });
        } else if (hasVideos) {
          await api.createPostWithVideos(
            formData.content?.trim(),
            videoFiles,
            formData.group_id
          );
          toast({
            title: "Processing",
            description: "Post created. Video is being processed...",
            variant: "pending",
          });
        } else if (hasImages) {
          await api.createPostWithImages(
            formData.content?.trim(),
            imageFiles,
            formData.group_id
          );
          toast({
            title: "Processing",
            description: "Post created. Images are being processed...",
            variant: "pending",
          });
        } else {
          // No media files, use regular create endpoint (manual URLs: separate image vs video)
          const manualUrls = formData.image_urls?.filter(url => url?.trim() && !url.startsWith("blob:")) || [];
          const imageUrls = manualUrls.filter(url => !isVideoUrl(url));
          const videoUrls = manualUrls.filter(url => isVideoUrl(url));
          const createData: CreatePostRequest = {
            content: formData.content?.trim() || undefined,
            image_urls: imageUrls.length > 0 ? imageUrls : undefined,
            video_urls: videoUrls.length > 0 ? videoUrls : undefined,
            group_id: groupId,
          };
          const result = await api.createPost(createData);
          const createdPost = result?.post || result?.data?.post || undefined;
          toast({ title: "Success", description: "Post created successfully" });
          onSuccess(createdPost);
        }
      }

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleInputChange = (
    field: keyof CreatePostRequest,
    value: any
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddImageURL = () => {
    const totalImages = imagePreviews.length + (formData.image_urls?.length || 0) + 1;
    if (totalImages > MAX_IMAGES) {
      toast({
        title: "Limit reached",
        description: `Maximum ${MAX_IMAGES} images per post.`,
        variant: "destructive",
      });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      image_urls: [...(prev.image_urls || []), ""],
    }));
    // Add empty preview for manual URL input
    setImagePreviews((prev) => [...prev, ""]);
  };

  const handleRemoveImageURL = (index: number) => {
    // Remove from form data (manual URL input index)
    setFormData((prev) => ({
      ...prev,
      image_urls: prev.image_urls?.filter((_, i) => i !== index) || [],
    }));
    
    // Find and remove from previews
    // Manual URLs are at: imageFiles.length + existingImageUrls.length + index
    const previewIndex = imageFiles.length + existingImageUrls.length + index;
    if (previewIndex < imagePreviews.length) {
      const previewToRemove = imagePreviews[previewIndex];
      if (previewToRemove && previewToRemove.startsWith("blob:")) {
        URL.revokeObjectURL(previewToRemove);
      }
      setImagePreviews((prev) => prev.filter((_, i) => i !== previewIndex));
    }
  };

  const handleImageURLChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newImageURLs = [...(prev.image_urls || [])];
      newImageURLs[index] = value;
      return { ...prev, image_urls: newImageURLs };
    });
    
    // Update preview - find the correct index in previews array
    // Manual URLs come after imageFiles and existingImageUrls
    const previewIndex = imageFiles.length + existingImageUrls.length + index;
    setImagePreviews((prev) => {
      const newPreviews = [...prev];
      if (value && value.trim() !== "") {
        // If URL is valid, add/update it in previews
        if (previewIndex < newPreviews.length) {
          newPreviews[previewIndex] = value;
        } else {
          newPreviews.push(value);
        }
      } else {
        // If URL is empty, remove from previews
        if (previewIndex < newPreviews.length) {
          newPreviews.splice(previewIndex, 1);
        }
      }
      return newPreviews;
    });
  };

  const processFiles = (files: File[], allowVideo = false) => {
    const imageFilesFromInput = files.filter((file) => file.type.startsWith("image/"));
    const videoFilesFromInput = allowVideo ? files.filter((file) => file.type.startsWith("video/")) : [];

    if (imageFilesFromInput.length === 0 && videoFilesFromInput.length === 0) {
      toast({
        title: "Error",
        description: "Select image or video file",
        variant: "destructive",
      });
      return;
    }

    // Images and video can be combined in one post
    if (imageFilesFromInput.length > 0) processImageFiles(imageFilesFromInput);
    if (videoFilesFromInput.length > 0) processVideoFiles(videoFilesFromInput);
  };

  const processImageFiles = (files: File[]) => {
    const remainingSlots = MAX_IMAGES - imagePreviews.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Error",
        description: `Maximum ${MAX_IMAGES} images.`,
        variant: "destructive",
      });
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    if (filesToAdd.length < files.length) {
      toast({
        title: "Limit reached",
        description: `Only ${remainingSlots} more image(s). Maximum ${MAX_IMAGES} per post.`,
        variant: "destructive",
      });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    const invalidFiles = filesToAdd.filter((file) => file.size > maxSize);
    if (invalidFiles.length > 0) {
      toast({
        title: "Error",
        description: "Some images exceed 10MB. Maximum 10MB per image.",
        variant: "destructive",
      });
      return;
    }

    setImageFiles((prev) => [...prev, ...filesToAdd]);
    const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    toast({ title: "Success", description: `${filesToAdd.length} image(s) added.` });
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(Array.from(files), true);
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files, true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processVideoFiles = (files: File[]) => {
    const remainingSlots = MAX_VIDEOS - videoPreviews.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Error",
        description: `Maximum ${MAX_VIDEOS} videos per post.`,
        variant: "destructive",
      });
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    if (filesToAdd.length < files.length) {
      toast({
        title: "Limit reached",
        description: `Only ${remainingSlots} more video(s). Maximum ${MAX_VIDEOS} per post.`,
        variant: "destructive",
      });
    }

    const invalidFiles = filesToAdd.filter((file) => file.size > MAX_VIDEO_SIZE);
    if (invalidFiles.length > 0) {
      toast({
        title: "Error",
        description: "Some videos exceed 20MB. Maximum 20MB per video.",
        variant: "destructive",
      });
      return;
    }

    setVideoFiles((prev) => [...prev, ...filesToAdd]);
    const newPreviews = filesToAdd.map((file) => URL.createObjectURL(file));
    setVideoPreviews((prev) => [...prev, ...newPreviews]);
    toast({ title: "Success", description: `${filesToAdd.length} video(s) added.` });
  };

  const handleRemoveVideo = (index: number) => {
    setVideoFiles((prev) => prev.filter((_, i) => i !== index));

    const previewToRemove = videoPreviews[index];
    if (previewToRemove && previewToRemove.startsWith("blob:")) {
      URL.revokeObjectURL(previewToRemove);
    }
    setVideoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveImage = (index: number) => {
    const isFileObject = index < imageFiles.length;
    const urlIndex = index - imageFiles.length;
    const isExistingUrl = urlIndex >= 0 && urlIndex < existingImageUrls.length;
    const isManualUrl = urlIndex >= existingImageUrls.length;

    if (isFileObject) {
      setImageFiles((prev) => prev.filter((_, i) => i !== index));
    } else if (isExistingUrl) {
      setExistingImageUrls((prev) => prev.filter((_, i) => i !== urlIndex));
    } else if (isManualUrl) {
      const manualIndex = urlIndex - existingImageUrls.length;
      const filledIndices = (formData.image_urls || [])
        .map((u, i) => (u?.trim() ? i : -1))
        .filter((i) => i >= 0);
      const formDataIndex = filledIndices[manualIndex];
      if (formDataIndex !== undefined) {
        setFormData((prev) => ({
          ...prev,
          image_urls: prev.image_urls?.filter((_, i) => i !== formDataIndex) || [],
        }));
      }
    }

    const previewToRemove = imagePreviews[index];
    if (previewToRemove && previewToRemove.startsWith("blob:")) {
      URL.revokeObjectURL(previewToRemove);
    }
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    // Cleanup blob URLs before closing
    imagePreviews.forEach((preview) => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    });
    videoPreviews.forEach((preview) => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Post" : "Create Post"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content || ""}
              onChange={(e) => handleInputChange("content", e.target.value)}
              placeholder="What's on your mind?"
              rows={6}
              className="resize-none"
            />
          </div>

          {/* Media (images + video) — single box: click = browse, drag = drop */}
          <div className="space-y-2">
            <Label>Images & Video</Label>
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska,video/3gpp"
              multiple
              onChange={handleMediaSelect}
              className="hidden"
              id="media-upload"
              disabled={loading || uploading || (imagePreviews.length >= MAX_IMAGES && videoPreviews.length >= MAX_VIDEOS)}
            />
            {/* Kotak klik + drag: klik membuka file picker, drag menambah file */}
            <div
              ref={dropZoneRef}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (loading || uploading) return;
                if (imagePreviews.length >= MAX_IMAGES && videoPreviews.length >= MAX_VIDEOS) return;
                mediaInputRef.current?.click();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (loading || uploading) return;
                  if (imagePreviews.length >= MAX_IMAGES && videoPreviews.length >= MAX_VIDEOS) return;
                  mediaInputRef.current?.click();
                }
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-xl text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                imagePreviews.length === 0 && videoPreviews.length === 0 && (!formData.image_urls || formData.image_urls.length === 0)
                  ? "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-900/70 cursor-pointer min-h-[140px] flex items-center justify-center p-8"
                  : (imagePreviews.length > 0 || videoPreviews.length > 0)
                    ? "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer min-h-[56px] flex items-center justify-center p-3"
                    : "border-transparent min-h-0 p-3"
              } ${imagePreviews.length >= MAX_IMAGES && videoPreviews.length >= MAX_VIDEOS ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
            >
              {imagePreviews.length === 0 && videoPreviews.length === 0 && (!formData.image_urls || formData.image_urls.length === 0) ? (
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <ImageIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Drag and drop images or video here, or click to browse
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Max {MAX_IMAGES} images (10MB each) + {MAX_VIDEOS} videos (20MB each). Can be combined in one post.
                  </p>
                </div>
              ) : (
                imagePreviews.length > 0 || videoPreviews.length > 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Drop to add more, or click to browse
                  </p>
                ) : null
              )}
            </div>

            {(imagePreviews.length > 0 || videoPreviews.length > 0) && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                {imagePreviews.length > 0 && `${imagePreviews.length}/${MAX_IMAGES} images`}
                {imagePreviews.length > 0 && videoPreviews.length > 0 && " · "}
                {videoPreviews.length > 0 && `${videoPreviews.length}/${MAX_VIDEOS} video`}
              </p>
            )}

            {/* Upload Progress (only shown during submit) */}
            {uploading && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Uploading media
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Previews: single grid for images + video */}
            {(imagePreviews.length > 0 || videoPreviews.length > 0) && (
              <div className="mt-4 space-y-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Selected: {imagePreviews.length} image(s), {videoPreviews.length} video(s)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imagePreviews.map((preview, index) => {
                    if (!preview || preview.trim() === "") return null;
                    const isVideo = isVideoUrl(preview);
                    return (
                      <div key={`img-${index}`} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 shadow-sm">
                        <div className={`relative ${isVideo ? "aspect-video" : "aspect-square"}`}>
                          {isVideo ? (
                            <video src={preview} controls className="w-full h-full object-cover bg-black" preload="metadata" />
                          ) : (
                            <Image
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, 33vw"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          )}
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
                            {isVideo ? "Video" : "Image"}
                          </span>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                            onClick={() => handleRemoveImage(index)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {videoPreviews.map((preview, index) => (
                    <div key={`vid-${index}`} className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 shadow-sm">
                      <div className="relative aspect-video">
                        <video src={preview} controls className="w-full h-full object-cover bg-black" preload="metadata" />
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
                          Video
                        </span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                          onClick={() => handleRemoveVideo(index)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 px-2 py-1 truncate">
                        {videoFiles[index]?.name} · {((videoFiles[index]?.size || 0) / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Is Pinned (only for edit) */}
          {isEditMode && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_pinned"
                checked={formData.is_pinned || false}
                onChange={(e) =>
                  handleInputChange("is_pinned", e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_pinned">Pin this post</Label>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Skeleton className="h-4 w-4 mr-2 shrink-0" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditMode ? "Update" : "Create"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

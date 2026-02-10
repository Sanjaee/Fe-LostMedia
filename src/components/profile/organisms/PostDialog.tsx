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
import { Loader2, X, Plus, Upload, Image as ImageIcon, Video } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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

  /** Deteksi URL video dari ekstensi (untuk manual URL: tampil video vs gambar) */
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
    setLoading(true);

    try {
      if (isEditMode && post) {
        // Edit mode: formData.image_urls sudah gabungan image+video dari post, pisah untuk API
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
        // For create mode, use async upload endpoints if there are media files
        if (videoFiles.length > 0) {
          // Use async video upload endpoint — post will appear via WebSocket when upload finishes
          await api.createPostWithVideos(
            formData.content?.trim(),
            videoFiles,
            formData.group_id
          );
          toast({
            title: "Diproses",
            description: "Post dibuat. Video sedang diproses...",
            variant: "pending",
          });
          // Don't call onSuccess — wait for WebSocket new_post when upload is done
        } else if (imageFiles.length > 0) {
          // Use async image upload endpoint — post will appear via WebSocket when upload finishes
          await api.createPostWithImages(
            formData.content?.trim(),
            imageFiles,
            formData.group_id
          );
          toast({
            title: "Diproses",
            description: "Post dibuat. Gambar sedang diproses...",
            variant: "pending",
          });
          // Don't call onSuccess — wait for WebSocket new_post when upload is done
        } else {
          // No media files, use regular create endpoint (manual URLs: pisah gambar vs video)
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

  const processFiles = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select image files only",
        variant: "destructive",
      });
      return;
    }

    const remainingSlots = MAX_IMAGES - imagePreviews.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Error",
        description: `Maximum ${MAX_IMAGES} images allowed.`,
        variant: "destructive",
      });
      return;
    }

    const filesToAdd = imageFiles.slice(0, remainingSlots);
    if (filesToAdd.length < imageFiles.length) {
      toast({
        title: "Limit reached",
        description: `Only ${remainingSlots} more image(s) can be added. Maximum ${MAX_IMAGES} images per post.`,
        variant: "destructive",
      });
    }

    // Validate file sizes (max 10MB each)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const invalidFiles = filesToAdd.filter((file) => file.size > maxSize);
    if (invalidFiles.length > 0) {
      toast({
        title: "Error",
        description: `Some images exceed 10MB limit. Maximum file size is 10MB per image.`,
        variant: "destructive",
      });
      return;
    }

    // Store File objects in state
    setImageFiles((prev) => [...prev, ...filesToAdd]);

    // Create preview URLs for selected files
    const newPreviews: string[] = [];
    filesToAdd.forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      newPreviews.push(previewUrl);
    });

    setImagePreviews((prev) => [...prev, ...newPreviews]);

    toast({
      title: "Success",
      description: `${filesToAdd.length} image(s) added. They will be uploaded when you submit.`,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    processFiles(fileArray);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFiles(files);
    }
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

  // --- Video handling ---
  const processVideoFiles = (files: File[]) => {
    const vFiles = files.filter((file) => file.type.startsWith("video/"));

    if (vFiles.length === 0) {
      toast({
        title: "Error",
        description: "Pilih file video saja (mp4, mov, avi, webm, mkv, 3gp)",
        variant: "destructive",
      });
      return;
    }

    const remainingSlots = MAX_VIDEOS - videoPreviews.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Error",
        description: `Maksimal ${MAX_VIDEOS} video per post.`,
        variant: "destructive",
      });
      return;
    }

    const filesToAdd = vFiles.slice(0, remainingSlots);
    if (filesToAdd.length < vFiles.length) {
      toast({
        title: "Limit reached",
        description: `Hanya ${remainingSlots} video lagi yang bisa ditambahkan. Maksimal ${MAX_VIDEOS} video per post.`,
        variant: "destructive",
      });
    }

    // Validate file sizes (max 20MB each)
    const invalidFiles = filesToAdd.filter((file) => file.size > MAX_VIDEO_SIZE);
    if (invalidFiles.length > 0) {
      toast({
        title: "Error",
        description: `Beberapa video melebihi batas 20MB. Maksimal ukuran file 20MB per video.`,
        variant: "destructive",
      });
      return;
    }

    setVideoFiles((prev) => [...prev, ...filesToAdd]);

    const newPreviews: string[] = [];
    filesToAdd.forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      newPreviews.push(previewUrl);
    });

    setVideoPreviews((prev) => [...prev, ...newPreviews]);

    toast({
      title: "Success",
      description: `${filesToAdd.length} video ditambahkan. Akan diupload saat submit.`,
    });
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    processVideoFiles(Array.from(files));

    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
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

          {/* Image Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Images</Label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-upload"
                  disabled={loading || uploading || imagePreviews.length >= MAX_IMAGES}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploading || imagePreviews.length >= MAX_IMAGES || videoFiles.length > 0}
                  title={
                    videoFiles.length > 0
                      ? "Tidak bisa upload gambar bersamaan dengan video"
                      : imagePreviews.length >= MAX_IMAGES
                      ? `Maximum ${MAX_IMAGES} images allowed`
                      : `Select up to ${MAX_IMAGES} images (max 10MB each)`
                  }
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Select Images {imagePreviews.length > 0 && `(${imagePreviews.length}/${MAX_IMAGES})`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddImageURL}
                  disabled={loading || uploading || imagePreviews.length >= MAX_IMAGES || videoFiles.length > 0}
                  title={imagePreviews.length >= MAX_IMAGES ? `Maximum ${MAX_IMAGES} images allowed` : "Add image URL"}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add URL
                </Button>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                imagePreviews.length === 0 && (!formData.image_urls || formData.image_urls.length === 0)
                  ? "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-400 dark:hover:border-gray-600"
                  : "border-transparent"
              } ${imagePreviews.length >= MAX_IMAGES ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {imagePreviews.length === 0 && (!formData.image_urls || formData.image_urls.length === 0) ? (
                <div className="flex flex-col items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Drag and drop images here, or click &quot;Select Images&quot;
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Maximum {MAX_IMAGES} images, 10MB per image. Images will be uploaded when you submit.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Image count indicator */}
            {imagePreviews.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                {imagePreviews.length}/{MAX_IMAGES} images selected (max 10MB each)
              </p>
            )}

            {/* Upload Progress (only shown during submit) */}
            {uploading && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Uploading images
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

            {/* Image & Video URL Previews (gambar dan video digabung) */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {imagePreviews.map((preview, index) => {
                  if (!preview || preview.trim() === "") return null;
                  const isVideo = isVideoUrl(preview);
                  return (
                    <div key={`preview-${index}-${preview.substring(0, 30)}`} className="relative group">
                      <div className={`relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ${isVideo ? "aspect-video" : "aspect-square"}`}>
                        {isVideo ? (
                          <video
                            src={preview}
                            controls
                            className="w-full h-full object-contain bg-black"
                            preload="metadata"
                          />
                        ) : (
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 33vw"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Manual URL Input: gambar dan video digabung (URL video ditampilkan sebagai video) */}
            {formData.image_urls && formData.image_urls.some(url => !url || url.trim() === "") && (
              <div className="space-y-2 mt-4">
                <Label className="text-sm text-gray-600 dark:text-gray-400">
                  Add image or video URLs manually:
                </Label>
                {formData.image_urls.map((url, index) => {
                  if (url && url.trim() !== "") return null;
                  return (
                    <div key={`url-${index}`} className="flex gap-2">
                      <Input
                        type="url"
                        value={url || ""}
                        onChange={(e) =>
                          handleImageURLChange(index, e.target.value)
                        }
                        placeholder="https://example.com/image.jpg atau video.mp4"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveImageURL(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Video Upload */}
          {!isEditMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Video</Label>
                <div className="flex gap-2">
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska,video/3gpp"
                    multiple
                    onChange={handleVideoSelect}
                    className="hidden"
                    id="video-upload"
                    disabled={loading || uploading || videoPreviews.length >= MAX_VIDEOS || imageFiles.length > 0}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={loading || uploading || videoPreviews.length >= MAX_VIDEOS || imageFiles.length > 0}
                    title={
                      imageFiles.length > 0
                        ? "Tidak bisa upload video bersamaan dengan gambar"
                        : videoPreviews.length >= MAX_VIDEOS
                        ? `Maksimal ${MAX_VIDEOS} video`
                        : `Pilih video (maks ${MAX_VIDEOS}, 20MB per video)`
                    }
                  >
                    <Video className="h-4 w-4 mr-1" />
                    Pilih Video {videoPreviews.length > 0 && `(${videoPreviews.length}/${MAX_VIDEOS})`}
                  </Button>
                </div>
              </div>

              {imageFiles.length > 0 && videoPreviews.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Tidak bisa upload video bersamaan dengan gambar. Hapus gambar terlebih dahulu.
                </p>
              )}

              {videoFiles.length > 0 && imageFiles.length === 0 && imagePreviews.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Tidak bisa upload gambar bersamaan dengan video. Hapus video terlebih dahulu.
                </p>
              )}

              {/* Video Previews */}
              {videoPreviews.length > 0 && (
                <div className="space-y-3 mt-2">
                  {videoPreviews.map((preview, index) => (
                    <div key={`video-preview-${index}`} className="relative group">
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <video
                          src={preview}
                          controls
                          className="w-full max-h-64 object-contain bg-black"
                          preload="metadata"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveVideo(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {videoFiles[index]?.name} ({(videoFiles[index]?.size / (1024 * 1024)).toFixed(1)} MB)
                      </p>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {videoPreviews.length}/{MAX_VIDEOS} video (maks 20MB per video)
                  </p>
                </div>
              )}
            </div>
          )}

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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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

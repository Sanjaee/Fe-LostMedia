"use client";

import React, { useState, useEffect } from "react";
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
import { Loader2, X, Plus } from "lucide-react";
import type { Post, CreatePostRequest, UpdatePostRequest } from "@/types/post";

interface PostDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  post?: Post | null; // If provided, it's edit mode
  userId: string;
}

export const PostDialog: React.FC<PostDialogProps> = ({
  open,
  onClose,
  onSuccess,
  post,
  userId, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const { toast } = useToast();
  const { api } = useApi();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePostRequest>({
    content: "",
    image_urls: [],
  });

  const isEditMode = !!post;

  useEffect(() => {
    if (post && open) {
      setFormData({
        content: post.content || "",
        image_urls: post.image_urls || [],
        is_pinned: post.is_pinned,
      });
    } else if (open) {
      setFormData({
        content: "",
        image_urls: [],
      });
    }
  }, [post, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cleanImageUrls = formData.image_urls?.filter(url => url?.trim()) || [];
      
      if (isEditMode && post) {
        const updateData: UpdatePostRequest = {
          content: formData.content?.trim() || undefined,
          image_urls: cleanImageUrls.length > 0 ? cleanImageUrls : undefined,
          is_pinned: formData.is_pinned,
        };
        await api.updatePost(post.id, updateData);
        toast({ title: "Success", description: "Post updated successfully" });
      } else {
        const createData: CreatePostRequest = {
          content: formData.content?.trim() || undefined,
          image_urls: cleanImageUrls.length > 0 ? cleanImageUrls : undefined,
        };
        await api.createPost(createData);
        toast({ title: "Success", description: "Post created successfully" });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof CreatePostRequest,
    value: any
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddImageURL = () => {
    setFormData((prev) => ({
      ...prev,
      image_urls: [...(prev.image_urls || []), ""],
    }));
  };

  const handleRemoveImageURL = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      image_urls: prev.image_urls?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleImageURLChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newImageURLs = [...(prev.image_urls || [])];
      newImageURLs[index] = value;
      return { ...prev, image_urls: newImageURLs };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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

          {/* Image URLs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Image URLs</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddImageURL}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Image
              </Button>
            </div>
            {formData.image_urls && formData.image_urls.length > 0 ? (
              <div className="space-y-2">
                {formData.image_urls.map((url, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="url"
                      value={url}
                      onChange={(e) =>
                        handleImageURLChange(index, e.target.value)
                      }
                      placeholder="https://example.com/image.jpg"
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
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No images added. Click &quot;Add Image&quot; to add image URLs.
              </p>
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

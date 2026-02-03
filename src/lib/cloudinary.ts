// Cloudinary utility for image uploads (server-side via API route)

/**
 * Upload image to Cloudinary via server-side API route
 * @param file - File object to upload
 * @returns Promise with the uploaded image URL
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  // Validate file size (max 3MB)
  const maxSize = 3 * 1024 * 1024; // 3MB
  if (file.size > maxSize) {
    throw new Error("Image size must be less than 3MB");
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/upload/cloudinary", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to upload image");
    }

    const data = await response.json();
    return data.url || data.secure_url;
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw error instanceof Error ? error : new Error("Failed to upload image");
  }
}

/**
 * Upload multiple images to Cloudinary via server-side API route
 * @param files - Array of File objects to upload
 * @param onProgress - Optional callback for upload progress
 * @returns Promise with array of uploaded image URLs
 */
export async function uploadMultipleImagesToCloudinary(
  files: File[],
  onProgress?: (progress: number) => void
): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  // Validate maximum 3 files
  if (files.length > 3) {
    throw new Error("Maximum 3 images allowed. Please select up to 3 images.");
  }

  // Validate all files first
  const maxSize = 3 * 1024 * 1024; // 3MB
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`File ${file.name} is not an image`);
    }
    if (file.size > maxSize) {
      throw new Error(`File ${file.name} exceeds 3MB limit. Maximum file size is 3MB per image.`);
    }
  }

  // Create form data with all files
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("file", file);
  });

  try {
    if (onProgress) {
      onProgress(10); // Start progress
    }

    const response = await fetch("/api/upload/cloudinary", {
      method: "POST",
      body: formData,
    });

    if (onProgress) {
      onProgress(50);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to upload images");
    }

    if (onProgress) {
      onProgress(90);
    }

    const data = await response.json();
    
    // Handle both single and multiple file responses
    let urls: string[] = [];
    if (data.url) {
      // Single file response
      urls = [data.url];
    } else if (data.urls && Array.isArray(data.urls)) {
      // Multiple files response
      urls = data.urls;
    } else {
      throw new Error("Invalid response format from upload API");
    }

    if (onProgress) {
      onProgress(100);
    }

    return urls;
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    throw error instanceof Error ? error : new Error("Failed to upload images");
  }
}

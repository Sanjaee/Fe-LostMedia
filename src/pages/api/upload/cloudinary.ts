import type { NextApiRequest, NextApiResponse } from "next";
import cloudinary from "@/lib/cloudinary-config";
import formidable, { File } from "formidable";
import fs from "fs";

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false, // wajib untuk file upload
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ url?: string; urls?: string[]; error?: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check if Cloudinary is configured
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return res.status(500).json({
      error: "Cloudinary configuration is missing. Please check your environment variables.",
    });
  }

  const form = formidable({
    maxFileSize: 3 * 1024 * 1024, // 3MB per file
    keepExtensions: true,
    multiples: true, // Allow multiple files
  });

  try {
    // Parse form data using Promise wrapper
    const { files } = await new Promise<{ files: any }>((resolve, reject) => {
      form.parse(req, (err: Error | null, _fields: formidable.Fields, files: formidable.Files) => {
        if (err) reject(err);
        resolve({ files });
      });
    });

    // Handle single file or multiple files
    const uploadedFiles: File[] = Array.isArray(files.file)
      ? files.file
      : files.file
      ? [files.file]
      : [];

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Validate maximum 3 files
    if (uploadedFiles.length > 3) {
      return res.status(400).json({ 
        error: "Maximum 3 images allowed. Please select up to 3 images." 
      });
    }

    // Validate file size (3MB per file)
    const maxSize = 3 * 1024 * 1024; // 3MB
    for (const file of uploadedFiles) {
      if (file.size > maxSize) {
        return res.status(400).json({ 
          error: `File ${file.originalFilename || "unknown"} exceeds 3MB limit. Maximum file size is 3MB per image.` 
        });
      }
    }

    const uploadResults: string[] = [];

    // Upload files sequentially to avoid overwhelming Cloudinary
    for (const file of uploadedFiles) {
      try {
        const result = await cloudinary.uploader.upload(file.filepath, {
          folder: process.env.CLOUDINARY_FOLDER || "social-media",
          resource_type: "image",
          transformation: [
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
        });

        uploadResults.push(result.secure_url);

        // Clean up temporary file
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      } catch (error: any) {
        // Clean up temporary file even on error
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
        console.error(`Failed to upload file ${file.originalFilename}:`, error);
        throw error;
      }
    }

    // Response fleksibel (single / multiple)
    if (uploadResults.length === 1) {
      return res.status(200).json({ url: uploadResults[0] });
    }

    return res.status(200).json({ urls: uploadResults });
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return res.status(500).json({
      error: error.message || "Cloudinary upload failed",
    });
  }
}

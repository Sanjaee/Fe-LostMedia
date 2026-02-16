import React, { useRef, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
import { useApi } from "@/components/contex/ApiProvider";
import { useToast } from "@/hooks/use-toast";

interface ProfileAvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showEditIcon?: boolean;
  onClick?: () => void;
  className?: string;
  enableDialog?: boolean;
  /** Jika true, tampilkan tombol upload di dialog dan refresh session setelah upload (tanpa login ulang) */
  enableUpload?: boolean;
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
  xl: "h-40 w-40",
};

const ACCEPTED_IMAGE = "image/jpeg,image/png,image/webp";

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  src,
  alt,
  name = "User",
  size = "lg",
  showEditIcon = false,
  onClick,
  className,
  enableDialog = true,
  enableUpload = false,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { update: updateSession } = useSession();
  const { api } = useApi();
  const { toast } = useToast();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarClick = () => {
    if (onClick) {
      onClick();
    }
    if (enableDialog) {
      setIsDialogOpen(true);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast({ title: "Pilih file gambar (JPEG, PNG, WebP)", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await api.uploadAvatar(file);
      await updateSession({ trigger: "update" });
      toast({ title: "Foto profil berhasil diubah" });
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Gagal mengupload", description: err?.message || "Coba lagi", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const avatarContent = (
    <div 
      className={cn("relative inline-block", className)}
      onClick={handleAvatarClick}
    >
      <Avatar
        className={cn(
          sizeClasses[size],
          "border-4 border-white dark:border-gray-800 shadow-lg",
          (onClick || enableDialog) && "cursor-pointer hover:opacity-90 transition-opacity"
        )}
      >
        <AvatarImage src={src} alt={alt || name} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {showEditIcon && (
        <div 
          className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-blue-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
        >
          <Camera className="h-4 w-4" />
        </div>
      )}
    </div>
  );

  if (!enableDialog) {
    return avatarContent;
  }

  return (
    <>
      {avatarContent}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE}
        className="hidden"
        onChange={handleFileChange}
      />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 bg-transparent border-none shadow-none">
          <div className="flex flex-col items-center justify-center p-6 gap-4">
            {src ? (
              <div className="relative w-full h-[80vh] max-h-[80vh]">
                <Image
                  src={src}
                  alt={alt || name}
                  fill
                  className="rounded-lg object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <Avatar className="h-96 w-96 border-4 border-white dark:border-gray-800 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-9xl font-semibold">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
            )}
            {enableUpload && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleUploadClick}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Mengupload..." : "Ubah foto profil"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

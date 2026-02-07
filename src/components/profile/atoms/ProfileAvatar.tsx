import React, { useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ProfileAvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showEditIcon?: boolean;
  onClick?: () => void;
  className?: string;
  enableDialog?: boolean;
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
  xl: "h-40 w-40",
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  src,
  alt,
  name = "User",
  size = "lg",
  showEditIcon = false,
  onClick,
  className,
  enableDialog = true,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 bg-transparent border-none shadow-none">
          <div className="flex items-center justify-center p-6">
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

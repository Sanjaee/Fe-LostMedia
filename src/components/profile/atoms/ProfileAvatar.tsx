import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showEditIcon?: boolean;
  onClick?: () => void;
  className?: string;
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
}) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar
        className={cn(
          sizeClasses[size],
          "border-4 border-white dark:border-gray-800 shadow-lg",
          onClick && "cursor-pointer hover:opacity-90 transition-opacity"
        )}
        onClick={onClick}
      >
        <AvatarImage src={src} alt={alt || name} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {showEditIcon && (
        <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
          <Camera className="h-4 w-4" />
        </div>
      )}
    </div>
  );
};

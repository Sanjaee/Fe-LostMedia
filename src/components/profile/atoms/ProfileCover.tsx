import React from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProfileCoverProps {
  src?: string;
  alt?: string;
  showEditButton?: boolean;
  onEditClick?: () => void;
  className?: string;
}

export const ProfileCover: React.FC<ProfileCoverProps> = ({
  src,
  alt = "Cover photo",
  showEditButton = false,
  onEditClick,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative w-full h-64 md:h-80 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800",
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No cover photo
            </p>
          </div>
        </div>
      )}
      {showEditButton && (
        <div className="absolute bottom-4 right-4">
          <Button
            variant="default"
            size="sm"
            onClick={onEditClick}
            className="bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Camera className="h-4 w-4 mr-2" />
            {src ? "Edit Cover" : "Add Cover Photo"}
          </Button>
        </div>
      )}
    </div>
  );
};

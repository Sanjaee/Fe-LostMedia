import React from "react";
import { Plus, Image } from "lucide-react";
import { ProfileInfo } from "./ProfileInfo";
import { Profile } from "@/types/profile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProfileDetailsProps {
  profile: Profile;
  isOwnProfile?: boolean;
  onEditClick?: () => void;
  className?: string;
}

export const ProfileDetails: React.FC<ProfileDetailsProps> = ({
  profile,
  isOwnProfile = false,
  onEditClick,
  className,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Details Card */}
      <ProfileInfo
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEditClick={onEditClick}
      />

      {/* Highlights Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sorotan</h2>
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambahkan sorotan
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isOwnProfile
            ? "Tambahkan sorotan untuk menampilkan informasi penting tentang Anda"
            : "Tidak ada sorotan"}
        </p>
      </div>

      {/* Photos Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Foto</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Lihat Semua Foto
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center"
            >
              <Image className="h-8 w-8 text-gray-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

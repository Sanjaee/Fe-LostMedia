import React from "react";
import { ProfileAvatar } from "../atoms/ProfileAvatar";
import { ProfileCover } from "../atoms/ProfileCover";
import { ProfileButton } from "../atoms/ProfileButton";
import { Edit, Settings } from "lucide-react";
import { Profile } from "@/types/profile";
import { cn } from "@/lib/utils";

interface ProfileHeaderProps {
  profile: Profile;
  isOwnProfile?: boolean;
  sessionName?: string | null;
  sessionImage?: string | null;
  onEditClick?: () => void;
  onSettingsClick?: () => void;
  onCoverEditClick?: () => void;
  onAvatarEditClick?: () => void;
  className?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isOwnProfile = false,
  sessionName,
  sessionImage,
  onEditClick,
  onSettingsClick,
  onCoverEditClick,
  onAvatarEditClick,
  className,
}) => {
  // Use session data for own profile, otherwise use profile data
  const userName = isOwnProfile && sessionName 
    ? sessionName 
    : profile.user?.full_name || "User";
  const userAvatar = isOwnProfile && sessionImage 
    ? sessionImage 
    : profile.user?.profile_photo;
  const username = profile.user?.username;

  return (
    <div className={cn("relative", className)}>
      {/* Cover Photo */}
      <ProfileCover
        src={profile.cover_photo}
        showEditButton={isOwnProfile}
        onEditClick={onCoverEditClick}
        className="rounded-t-lg"
      />

      {/* Profile Info Section */}
      <div className="relative px-4 md:px-8 pb-4 bg-white dark:bg-gray-900">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16 md:-mt-20">
            <ProfileAvatar
              src={userAvatar}
              name={userName}
              size="xl"
              showEditIcon={isOwnProfile}
              onClick={onAvatarEditClick}
              className="border-4 border-white dark:border-gray-900"
            />
            <div className="pt-4 md:pt-0 md:pb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {userName}
              </h1>
              {username && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  @{username}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>0 pengikut</span>
                <span>•</span>
                <span>0 mengikuti</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isOwnProfile && (
            <div className="flex gap-2 mt-4 md:mt-0 md:mb-4">
              <ProfileButton
                variant="outline"
                onClick={onEditClick}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </ProfileButton>
              <ProfileButton
                variant="outline"
                onClick={onSettingsClick}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </ProfileButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

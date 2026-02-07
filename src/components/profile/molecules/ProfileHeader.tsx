import React from "react";
import { ProfileAvatar } from "../atoms/ProfileAvatar";
import { ProfileCover } from "../atoms/ProfileCover";
import { ProfileButton } from "../atoms/ProfileButton";
import { UserNameWithRole } from "@/components/ui/UserNameWithRole";
import { Edit, Settings, UserPlus, Check } from "lucide-react";
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
  friendshipStatus?: string;
  onAddFriend?: () => void;
  friendsCount?: { followers: number; following: number };
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
  friendshipStatus,
  onAddFriend,
  friendsCount,
  className,
}) => {
  // Use session data for own profile, otherwise use profile data
  const userName = isOwnProfile && sessionName 
    ? sessionName 
    : profile.user?.full_name || profile.user?.email || "User";
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
            />
            <div className="pt-4 md:pt-0 md:pb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                <UserNameWithRole
                  displayName={userName}
                  role={profile.user?.user_type ?? profile.user?.role}
                  className="truncate inline-block max-w-full"
                />
              </h1>
              {username && (
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  @{username}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{friendsCount?.followers || 0} pengikut</span>
                <span>•</span>
                <span>{friendsCount?.following || 0} mengikuti</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 md:mt-0 md:mb-4">
            {isOwnProfile ? (
              <>
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
              </>
            ) : (
              <>
                {friendshipStatus === "accepted" ? (
                  <ProfileButton
                    variant="outline"
                    disabled
                    className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700"
                  >
                    <Check className="h-4 w-4" />
                    Berteman
                  </ProfileButton>
                ) : friendshipStatus === "pending" ? (
                  <ProfileButton
                    variant="outline"
                    disabled
                    className="flex items-center gap-2"
                  >
                    Menunggu Persetujuan
                  </ProfileButton>
                ) : (
                  <ProfileButton
                    variant="default"
                    onClick={onAddFriend}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <UserPlus className="h-4 w-4" />
                    Tambahkan Teman
                  </ProfileButton>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

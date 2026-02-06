import React, { useState } from "react";
import { ProfileHeader } from "../molecules/ProfileHeader";
import { ProfileTabs, ProfileTabType } from "../molecules/ProfileTabs";
import { ProfileDetails } from "../molecules/ProfileDetails";
import { ProfileForm } from "./ProfileForm";
import { PostDialog } from "./PostDialog";
import { PostList } from "./PostList";
import { Profile } from "@/types/profile";
import { Image as ImageIcon, Video, Smile, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface ProfileLayoutProps {
  profile: Profile;
  isOwnProfile?: boolean;
  sessionName?: string | null;
  sessionImage?: string | null;
  onProfileUpdate?: () => void;
  friendshipStatus?: string;
  onAddFriend?: () => void;
  friendsCount?: { followers: number; following: number };
  onFriendshipChange?: () => void;
  className?: string;
}

export const ProfileLayout: React.FC<ProfileLayoutProps> = ({
  profile,
  isOwnProfile = false,
  sessionName,
  sessionImage,
  onProfileUpdate,
  friendshipStatus,
  onAddFriend,
  friendsCount,
  onFriendshipChange,
  className,
}) => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ProfileTabType>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);

  // Use session data for own profile, otherwise use profile data
  const userName = isOwnProfile && sessionName 
    ? sessionName 
    : profile.user?.full_name || "User";
  const userAvatar = isOwnProfile && sessionImage 
    ? sessionImage 
    : profile.user?.profile_photo;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleTabChange = (tab: ProfileTabType) => {
    setActiveTab(tab);
  };

  const handleEditClick = () => {
    setIsFormOpen(true);
  };

  const handleCoverEditClick = () => {
    setIsEditingCover(true);
    // TODO: Implement cover photo upload
  };

  const handleAvatarEditClick = () => {
    setIsEditingAvatar(true);
    // TODO: Implement avatar upload
  };

  const handleFormSuccess = () => {
    if (onProfileUpdate) {
      onProfileUpdate();
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "all":
        return (
          <div className="space-y-4">
            {/* Post Creation Area */}
            {isOwnProfile && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => setIsPostDialogOpen(true)}
                    className="flex-1 w-full h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center px-4 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-left"
                  >
                    Apa yang Anda pikirkan, {userName.split(' ')[0]}?
                  </button>
                </div>
                <div className="flex justify-between px-4">
                  <Button variant="ghost" className="flex-1 gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Video className="w-6 h-6" />
                    <span className="hidden sm:inline">Video Langsung</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1 gap-2 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={() => setIsPostDialogOpen(true)}
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span className="hidden sm:inline">Foto/Video</span>
                  </Button>
                  <Button variant="ghost" className="flex-1 gap-2 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                    <Smile className="w-6 h-6" />
                    <span className="hidden sm:inline">Perasaan/Aktivitas</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Featured Section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Orang tidak akan melihat ini kecuali Anda menyematkan sesuatu.
                </p>
                {isOwnProfile && (
                  <Button variant="ghost" size="sm">
                    Kelola
                  </Button>
                )}
              </div>
            </div>

            {/* Posts Section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Postingan
                </h2>
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPostDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Buat Postingan
                  </Button>
                )}
              </div>
              <PostList
                userId={profile.user_id || profile.user?.id || ""}
                isOwnProfile={isOwnProfile}
                currentUserId={(session?.user?.id || profile.user?.id) as string}
              />
            </div>
          </div>
        );
      case "about":
        return (
          <div>
            <ProfileDetails
              profile={profile}
              isOwnProfile={isOwnProfile}
              onEditClick={handleEditClick}
            />
          </div>
        );
      case "photos":
        return (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Photos
            </h2>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No photos available</p>
            </div>
          </div>
        );
      case "followers":
        return (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Followers
            </h2>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No followers yet</p>
            </div>
          </div>
        );
      case "mentions":
        return (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Mentions
            </h2>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No mentions yet</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("min-h-screen bg-gray-100 dark:bg-gray-950", className)}>
      {/* Header */}
      <ProfileHeader
        profile={profile}
        isOwnProfile={isOwnProfile}
        sessionName={sessionName}
        sessionImage={sessionImage}
        onEditClick={handleEditClick}
        onCoverEditClick={handleCoverEditClick}
        onAvatarEditClick={handleAvatarEditClick}
        friendshipStatus={friendshipStatus}
        onAddFriend={onAddFriend}
        friendsCount={friendsCount}
      />

      {/* Tabs */}
      <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">{renderTabContent()}</div>

          {/* Sidebar - Only show on "all" tab */}
          {activeTab === "all" && (
            <div className="lg:col-span-1">
              <ProfileDetails
                profile={profile}
                isOwnProfile={isOwnProfile}
                onEditClick={handleEditClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Profile Form Dialog */}
      <ProfileForm
        profile={profile}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
      />

      {/* Post Dialog */}
      {isOwnProfile && (session?.user?.id || profile.user?.id) && (
        <PostDialog
          open={isPostDialogOpen}
          onClose={() => setIsPostDialogOpen(false)}
          onSuccess={() => {
            setIsPostDialogOpen(false);
            // Posts will be reloaded by PostList component
          }}
          userId={(session?.user?.id || profile.user?.id) as string}
        />
      )}
    </div>
  );
};

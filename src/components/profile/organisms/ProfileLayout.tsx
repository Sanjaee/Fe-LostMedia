import React, { useState } from "react";
import { ProfileHeader } from "../molecules/ProfileHeader";
import { ProfileTabs, ProfileTabType } from "../molecules/ProfileTabs";
import { ProfileDetails } from "../molecules/ProfileDetails";
import { ProfileForm } from "./ProfileForm";
import { Profile } from "@/types/profile";
import { Image, Video, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ProfileLayoutProps {
  profile: Profile;
  isOwnProfile?: boolean;
  sessionName?: string | null;
  sessionImage?: string | null;
  onProfileUpdate?: () => void;
  className?: string;
}

export const ProfileLayout: React.FC<ProfileLayoutProps> = ({
  profile,
  isOwnProfile = false,
  sessionName,
  sessionImage,
  onProfileUpdate,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTabType>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

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
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userAvatar} alt={userName} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Apa yang Anda pikirkan sekarang?"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="ghost" className="flex-1">
                    <Image className="h-5 w-5 mr-2" />
                    Foto/video
                  </Button>
                  <Button variant="ghost" className="flex-1">
                    <Video className="h-5 w-5 mr-2" />
                    Reel
                  </Button>
                  <Button variant="ghost" className="flex-1">
                    <Radio className="h-5 w-5 mr-2" />
                    Video siaran langsung
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
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">Filter</Button>
                  {isOwnProfile && (
                    <Button variant="ghost" size="sm">Kelola postingan</Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <Button
                  variant={activeTab === "all" ? "default" : "ghost"}
                  size="sm"
                >
                  Tampilan Daftar
                </Button>
                <Button variant="ghost" size="sm">Tampilan Kisi</Button>
              </div>
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>Tidak tersedia postingan</p>
              </div>
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
    </div>
  );
};

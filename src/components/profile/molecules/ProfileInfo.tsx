import React from "react";
import { Edit, Star, MessageCircle, MapPin, Globe, Briefcase, GraduationCap, Heart, Home } from "lucide-react";
import { Profile } from "@/types/profile";
import { cn } from "@/lib/utils";

interface ProfileInfoProps {
  profile: Profile;
  isOwnProfile?: boolean;
  onEditClick?: () => void;
  className?: string;
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onEdit?: () => void;
  isOwnProfile?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value, onEdit, isOwnProfile = false }) => {
  if (!value && !isOwnProfile) return null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-3 flex-1">
        <div className="text-gray-500 dark:text-gray-400">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
          {value ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{value}</p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic mt-1">Not set</p>
          )}
        </div>
      </div>
      {isOwnProfile && onEdit && (
        <button
          onClick={onEdit}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <Edit className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export const ProfileInfo: React.FC<ProfileInfoProps> = ({
  profile,
  isOwnProfile = false,
  onEditClick,
  className,
}) => {

  return (
    <div className={cn("bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rincian</h2>
        {isOwnProfile && onEditClick && (
          <button
            onClick={onEditClick}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        {/* Rating */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Belum dinilai (0 Ulasan)
            </span>
          </div>
        </div>

        {/* Bio */}
        <InfoItem
          icon={<MessageCircle className="h-5 w-5" />}
          label="Bio"
          value={profile.bio}
          onEdit={onEditClick}
          isOwnProfile={isOwnProfile}
        />

        {/* Location */}
        {profile.location && (
          <InfoItem
            icon={<MapPin className="h-5 w-5" />}
            label="Lokasi"
            value={profile.location}
            onEdit={onEditClick}
            isOwnProfile={isOwnProfile}
          />
        )}

        {/* City */}
        {profile.city && (
          <InfoItem
            icon={<MapPin className="h-5 w-5" />}
            label="Kota"
            value={profile.city}
            onEdit={onEditClick}
            isOwnProfile={isOwnProfile}
          />
        )}

        {/* Hometown */}
        {profile.hometown && (
          <InfoItem
            icon={<Home className="h-5 w-5" />}
            label="Kampung Halaman"
            value={profile.hometown}
            onEdit={onEditClick}
            isOwnProfile={isOwnProfile}
          />
        )}

        {/* Website */}
        {profile.website && (
          <InfoItem
            icon={<Globe className="h-5 w-5" />}
            label="Website"
            value={profile.website}
            onEdit={onEditClick}
            isOwnProfile={isOwnProfile}
          />
        )}

        {/* Work */}
        {profile.work && (
          <InfoItem
            icon={<Briefcase className="h-5 w-5" />}
            label="Pekerjaan"
            value={profile.work}
            onEdit={onEditClick}
            isOwnProfile={isOwnProfile}
          />
        )}

        {/* Education */}
        {profile.education && (
          <InfoItem
            icon={<GraduationCap className="h-5 w-5" />}
            label="Pendidikan"
            value={profile.education}
            onEdit={onEditClick}
            isOwnProfile={isOwnProfile}
          />
        )}

        {/* Relationship Status */}
        {profile.relationship_status && (
          <InfoItem
            icon={<Heart className="h-5 w-5" />}
            label="Status Hubungan"
            value={profile.relationship_status}
            onEdit={onEditClick}
            isOwnProfile={isOwnProfile}
          />
        )}

        {/* Intro */}
        {profile.intro && (
          <div className="py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Intro</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{profile.intro}</p>
          </div>
        )}
      </div>
    </div>
  );
};

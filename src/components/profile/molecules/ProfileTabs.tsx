import React from "react";
import { ProfileTab } from "../atoms/ProfileTab";
import { Home, Info, Image, Users, MessageSquare, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfileTabType = "all" | "about" | "photos" | "followers" | "mentions" | "more";

interface ProfileTabsProps {
  activeTab: ProfileTabType;
  onTabChange: (tab: ProfileTabType) => void;
  className?: string;
}

const tabs: Array<{
  id: ProfileTabType;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "all", label: "Semua", icon: <Home className="h-4 w-4" /> },
  { id: "about", label: "Tentang", icon: <Info className="h-4 w-4" /> },
  { id: "photos", label: "Foto", icon: <Image className="h-4 w-4" /> },
  { id: "followers", label: "Pengikut", icon: <Users className="h-4 w-4" /> },
  { id: "mentions", label: "Penyebutan", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "more", label: "Lainnya", icon: <MoreHorizontal className="h-4 w-4" /> },
];

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
  className,
}) => {
  return (
    <div className={cn("border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900", className)}>
      <div className="flex overflow-x-auto">
        {tabs.map((tab) => (
          <ProfileTab
            key={tab.id}
            label={tab.label}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            icon={tab.icon}
          />
        ))}
      </div>
    </div>
  );
};

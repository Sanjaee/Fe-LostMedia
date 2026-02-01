import React from "react";
import { cn } from "@/lib/utils";

interface ProfileTabProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  count?: number;
  icon?: React.ReactNode;
  className?: string;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  label,
  isActive = false,
  onClick,
  count,
  icon,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative px-4 py-3 text-sm font-medium transition-colors border-b-2",
        isActive
          ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
          : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="h-4 w-4">{icon}</span>}
        <span>{label}</span>
        {count !== undefined && count > 0 && (
          <span className="ml-1 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded-full">
            {count}
          </span>
        )}
      </div>
    </button>
  );
};

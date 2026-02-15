"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DarkModeToggleProps {
  className?: string;
  variant?: "icon" | "switch";
  size?: "sm" | "default" | "lg";
}

export function DarkModeToggle({
  className,
  variant = "icon",
  size = "default",
}: DarkModeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const toggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon"}
        onClick={toggle}
        className={cn("shrink-0", className)}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Sun className="h-[1.2rem] w-[1.2rem] text-zinc-100" />
        ) : (
          <Moon className="h-[1.2rem] w-[1.2rem] text-zinc-700" />
        )}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center gap-2 rounded-full p-1 transition-colors",
        "bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className={cn("rounded-full p-1", !isDark && "text-amber-600")}>
        <Sun className="h-4 w-4" />
      </span>
      <span className={cn("rounded-full p-1", isDark && "text-indigo-300")}>
        <Moon className="h-4 w-4" />
      </span>
    </button>
  );
}

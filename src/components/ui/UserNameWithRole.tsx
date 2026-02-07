"use client";

import React from "react";
import { getRoleBadge, getRoleNameClass } from "@/utils/roleStyles";

export interface UserNameWithRoleProps {
  /** Display name (username or full_name) */
  displayName: string;
  /** Role or user_type from backend */
  role?: string | null;
  /** Optional class for wrapper (e.g. font-semibold text-sm) */
  className?: string;
}

/**
 * Renders username with role badge motif (same as PostCard).
 * If role is set, shows badge + styled name; otherwise plain name.
 */
export function UserNameWithRole({
  displayName,
  role,
  className = "",
}: UserNameWithRoleProps) {
  const r = role ?? undefined;
  if (r) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <span className={`${getRoleBadge(r)} shrink-0 leading-none`} />
        <span className={getRoleNameClass(r)}>{displayName || "—"}</span>
      </span>
    );
  }
  return <span className={className}>{displayName || "—"}</span>;
}

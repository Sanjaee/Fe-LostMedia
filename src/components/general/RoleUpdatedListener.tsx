"use client";

import { useCallback } from "react";
import { useWebSocketSubscription } from "@/contexts/WebSocketContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Listens for real-time "role_updated" WebSocket events (when owner changes a user's role)
 * and shows a toast notification to the affected user.
 */
export default function RoleUpdatedListener() {
  const { toast } = useToast();

  useWebSocketSubscription(
    useCallback(
      (data: any) => {
        const payload = data?.payload || data;
        const inner = payload?.type === "role_updated" ? payload : payload?.payload;
        if (inner?.type !== "role_updated") return;

        const message =
          typeof inner.message === "string"
            ? inner.message
            : `Role Anda telah diubah menjadi ${inner.role || "member"}.`;
        toast({
          title: "Role Diubah",
          description: message,
          variant: "default",
        });
      },
      [toast]
    )
  );

  return null;
}

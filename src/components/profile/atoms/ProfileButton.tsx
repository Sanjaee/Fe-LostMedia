import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";

// ProfileButtonProps extends ButtonProps but allows "md" size which maps to "default"
// We use Omit to remove size from ButtonProps and redefine it with "md" option
type ProfileButtonProps = Omit<ButtonProps, "size"> & {
  size?: "sm" | "md" | "lg" | "default";
};

export const ProfileButton: React.FC<ProfileButtonProps> = ({
  children,
  className,
  variant = "default",
  size = "md",
  ...props
}) => {
  // Map "md" to "default" for Button component since Button doesn't support "md"
  const getButtonSize = (): ButtonProps["size"] => {
    if (size === "md") return "default";
    if (size === "sm" || size === "lg" || size === "default") return size;
    return "default";
  };

  return (
    <Button
      variant={variant}
      size={getButtonSize()}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
};

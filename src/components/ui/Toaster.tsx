"use client";

import { Toaster as SonnerToaster } from "sonner";

import { Icon, LogoMark } from "@/components/ui/Icon";

/** Sonner, themed from design tokens in globals.css. Rules: design.md §5 "Toast". */
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      gap={8}
      visibleToasts={3}
      duration={4000}
      containerAriaLabel="Notifications"
      icons={{
        success: <LogoMark size={16} />,
        error: <Icon name="alert" className="text-danger" />,
        info: <Icon name="info" className="text-info" />,
      }}
    />
  );
}

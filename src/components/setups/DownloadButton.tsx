"use client";

import { toast } from "sonner";

import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/styles";

/**
 * A plain link to the ZIP GitHub builds from the setup's repository — the browser performs
 * the download. The site cannot observe whether it succeeded, so the toast is a reminder,
 * never a success message.
 */
export function DownloadButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      rel="noopener noreferrer"
      onClick={() =>
        toast.info("Inspect before you use it", {
          description: "Read the files before copying them into a project.",
          duration: 6000,
        })
      }
      className={buttonClass("primary", "lg", "w-full")}
    >
      <Icon name="download" size={18} />
      Download ZIP
    </a>
  );
}

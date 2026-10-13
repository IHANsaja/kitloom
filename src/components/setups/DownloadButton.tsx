"use client";

import { toast } from "sonner";

import { copyText } from "@/components/ui/CopyButton";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/styles";

interface DownloadButtonProps {
  url: string;
  fileName: string;
  external: boolean;
  sha256: string | null;
}

/**
 * A plain link to the package's real URL — the browser performs the download. The site
 * cannot observe whether it succeeded, so the toast is a reminder, never a success message.
 */
export function DownloadButton({ url, fileName, external, sha256 }: DownloadButtonProps) {
  function remind() {
    if (sha256) {
      toast.info("Verify before you unzip", {
        description: `Compare ${fileName} with the SHA-256 on this page.`,
        action: { label: "Copy SHA-256", onClick: () => void copyText(sha256, "Checksum") },
        duration: 8000,
      });
    } else {
      toast.info("Inspect before you use it", {
        description: "No checksum was provided for this package.",
        duration: 6000,
      });
    }
  }

  return (
    <a
      href={url}
      onClick={remind}
      {...(external ? { rel: "noopener noreferrer" } : { download: fileName })}
      className={buttonClass("primary", "lg", "w-full")}
    >
      <Icon name="download" size={18} />
      Download ZIP
    </a>
  );
}

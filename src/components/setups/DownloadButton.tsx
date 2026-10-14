"use client";

import { useState } from "react";

import { ScanDialog } from "@/components/scan/ScanDialog";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/styles";
import { archiveRef } from "@/lib/packages/urls";

/**
 * Opens Heddle, the pre-download check. The ZIP link itself only appears inside the dialog,
 * once the check has run (or failed and the visitor has accepted the risk), and is pinned
 * to the commit that was checked.
 */
export function DownloadButton({ url, repositoryUrl }: { url: string; repositoryUrl: string }) {
  const [open, setOpen] = useState(false);
  const gitRef = archiveRef(url) ?? "HEAD";
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("primary", "lg", "w-full")} aria-haspopup="dialog">
        <Icon name="download" size={18} />
        Check and download
      </button>
      {open ? <ScanDialog repositoryUrl={repositoryUrl} gitRef={gitRef} fallbackUrl={url} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/styles";

interface CopyButtonProps {
  /** The exact text placed on the clipboard. */
  value: string;
  /** Button label, e.g. "Copy checksum". */
  label?: string;
  /** What was copied, for the confirmation, e.g. "Checksum". */
  subject?: string;
  className?: string;
}

type Status = "idle" | "copied" | "failed";

/** Older, permission-free path for browsers or embeds that reject the async Clipboard API. */
function legacyCopy(value: string): boolean {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** Copies text and reports what actually happened. Never claims success on failure. */
export async function copyText(value: string, subject: string): Promise<boolean> {
  let ok = false;
  try {
    await navigator.clipboard.writeText(value);
    ok = true;
  } catch {
    ok = legacyCopy(value);
  }
  if (ok) {
    const firstLine = value.split("\n")[0] ?? "";
    toast.success(`${subject} copied`, { description: firstLine.length > 44 ? `${firstLine.slice(0, 44)}…` : firstLine });
  } else {
    toast.error("Copy failed", { description: "Select the text and copy it manually." });
  }
  return ok;
}

export function CopyButton({ value, label = "Copy", subject = "Text", className }: CopyButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function handleClick() {
    const ok = await copyText(value, subject);
    setStatus(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <button type="button" onClick={handleClick} className={buttonClass("secondary", "sm", className)}>
      <Icon name={status === "copied" ? "check" : "copy"} size={14} className={status === "copied" ? "text-lime" : undefined} />
      <span aria-live="polite">{status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : label}</span>
    </button>
  );
}

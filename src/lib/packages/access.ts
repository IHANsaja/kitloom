import { fileNameFromDownloadUrl, isAllowedDownloadUrl } from "@/lib/packages/urls";
import type { Setup } from "@/types/catalog";

export type DownloadAccess =
  | {
      kind: "free";
      /** The ZIP GitHub generates from the repository. It changes whenever the repo does. */
      url: string;
      /** Null when GitHub decides the name at download time. */
      fileName: string | null;
    }
  | { kind: "unavailable"; reason: string };

/**
 * The single place that decides whether and how a setup can be downloaded.
 *
 * Today every listing is free and public, so this only checks that a safe package
 * reference exists. Future eligibility rules (private packages, purchases) belong here and
 * must be enforced by a trusted backend — never by hiding a button in the browser.
 */
export function getDownloadAccess(setup: Pick<Setup, "package">): DownloadAccess {
  const { downloadUrl } = setup.package;
  if (downloadUrl === null) {
    return { kind: "unavailable", reason: "This listing has no usable repository link." };
  }
  if (!isAllowedDownloadUrl(downloadUrl)) {
    return { kind: "unavailable", reason: "The package link failed Kitloom's URL checks." };
  }
  return { kind: "free", url: downloadUrl, fileName: fileNameFromDownloadUrl(downloadUrl) };
}

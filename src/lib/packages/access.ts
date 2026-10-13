import { fileNameFromDownloadUrl, isAllowedDownloadUrl } from "@/lib/packages/urls";
import type { Setup } from "@/types/catalog";

export type DownloadAccess =
  | {
      kind: "free";
      url: string;
      fileName: string;
      /** True when the file is hosted outside this site (a GitHub release asset). */
      external: boolean;
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
    return { kind: "unavailable", reason: "The creator has not published a package file yet." };
  }
  const fileName = fileNameFromDownloadUrl(downloadUrl);
  if (!isAllowedDownloadUrl(downloadUrl) || fileName === null) {
    return { kind: "unavailable", reason: "The package link failed Kitloom's URL checks." };
  }
  return { kind: "free", url: downloadUrl, fileName, external: !downloadUrl.startsWith("/") };
}

import { fileNameFromDownloadUrl, isAllowedDownloadUrl, isGitHubArchiveUrl } from "@/lib/packages/urls";
import type { Setup } from "@/types/catalog";

export type DownloadSource =
  /** Built from packages/ in this repository and served by this site. */
  | "site"
  /** A fixed file attached to a GitHub release. */
  | "github-release"
  /** A ZIP GitHub generates from the repository's branch. It changes whenever the repo does. */
  | "github-archive";

export type DownloadAccess =
  | {
      kind: "free";
      url: string;
      /** Null when GitHub decides the name at download time. */
      fileName: string | null;
      source: DownloadSource;
      /** True when the file is hosted outside this site. */
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
  if (!isAllowedDownloadUrl(downloadUrl)) {
    return { kind: "unavailable", reason: "The package link failed Kitloom's URL checks." };
  }
  const fileName = fileNameFromDownloadUrl(downloadUrl);
  if (isGitHubArchiveUrl(downloadUrl)) {
    return { kind: "free", url: downloadUrl, fileName, source: "github-archive", external: true };
  }
  if (fileName === null) {
    return { kind: "unavailable", reason: "The package link failed Kitloom's URL checks." };
  }
  const external = !downloadUrl.startsWith("/");
  return { kind: "free", url: downloadUrl, fileName, source: external ? "github-release" : "site", external };
}

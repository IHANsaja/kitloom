/** Manifest paths are relative, POSIX-style, and may never escape the package root. */
export function isSafeManifestPath(value: string): boolean {
  if (value.length === 0 || value.length > 260) return false;
  if (value.startsWith("/") || value.includes("\\") || /^[A-Za-z]:/.test(value)) return false;
  if (/[\u0000-\u001f]/.test(value)) return false;
  return value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

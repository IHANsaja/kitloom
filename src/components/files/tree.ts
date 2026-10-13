import type { ManifestEntry } from "@/types/catalog";

export type TreeNode =
  | { kind: "dir"; name: string; path: string; children: TreeNode[] }
  | { kind: "file"; name: string; path: string; sizeBytes: number | null };

/** Turns a flat list of safe relative paths into a tree: directories first, then by name. */
export function buildTree(manifest: readonly ManifestEntry[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const entry of manifest) {
    const segments = entry.path.split("/");
    let level = root;
    segments.forEach((name, index) => {
      const path = segments.slice(0, index + 1).join("/");
      if (index === segments.length - 1) {
        level.push({ kind: "file", name, path, sizeBytes: entry.sizeBytes });
        return;
      }
      let dir = level.find((node): node is Extract<TreeNode, { kind: "dir" }> => node.kind === "dir" && node.name === name);
      if (!dir) {
        dir = { kind: "dir", name, path, children: [] };
        level.push(dir);
      }
      level = dir.children;
    });
  }

  const sort = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .map((node) => (node.kind === "dir" ? { ...node, children: sort(node.children) } : node))
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, "en") : a.kind === "dir" ? -1 : 1));

  return sort(root);
}

export function totalBytes(manifest: readonly ManifestEntry[]): number | null {
  if (manifest.some((entry) => entry.sizeBytes === null)) return null;
  return manifest.reduce((sum, entry) => sum + (entry.sizeBytes ?? 0), 0);
}

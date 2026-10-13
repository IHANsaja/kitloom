import { buildTree, type TreeNode } from "@/components/files/tree";
import { Icon } from "@/components/ui/Icon";
import { formatBytes } from "@/lib/format";
import type { ManifestEntry } from "@/types/catalog";

function Node({ node }: { node: TreeNode }) {
  if (node.kind === "file") {
    return (
      <li data-reveal-item className="flex items-center justify-between gap-6 py-[3px]">
        <span className="flex min-w-0 items-center gap-2 text-fg">
          <Icon name="file" size={14} className="shrink-0 text-fg-2" />
          <span className="whitespace-nowrap">{node.name}</span>
        </span>
        {node.sizeBytes !== null ? (
          // Pinned to the right edge so sizes stay visible when long paths make the tree scroll.
          <span className="sticky right-0 shrink-0 bg-carbon pl-3 text-xs whitespace-nowrap text-fg-2 tabular-nums">{formatBytes(node.sizeBytes)}</span>
        ) : null}
      </li>
    );
  }
  return (
    <li>
      <details open className="group/dir">
        <summary data-reveal-item className="flex list-none items-center gap-2 rounded-xs py-[3px] text-fg hover:text-lime">
          <Icon name="chevron" size={14} className="shrink-0 text-fg-2 transition-transform duration-150 ease-kit group-open/dir:rotate-90" />
          <span className="whitespace-nowrap">{node.name}/</span>
        </summary>
        <ul className="ml-[6px] border-l border-line-subtle pl-[14px]">
          {node.children.map((child) => (
            <Node key={child.path} node={child} />
          ))}
        </ul>
      </details>
    </li>
  );
}

interface FileTreeProps {
  /** Shown as the root folder, e.g. the folder the ZIP extracts to. */
  rootName: string;
  manifest: readonly ManifestEntry[];
}

/**
 * Renders the package structure from catalog manifest data only. Directories are native
 * <details>, so the tree is collapsible without JavaScript.
 */
export function FileTree({ rootName, manifest }: FileTreeProps) {
  const tree = buildTree(manifest);
  return (
    // Focusable because long paths make this region scroll horizontally.
    <div tabIndex={0} role="group" aria-label={`Files in ${rootName}`} className="overflow-x-auto overflow-y-hidden font-mono text-code">
      <div className="w-max min-w-full">
        <p data-reveal-item className="flex items-center gap-2 py-[3px] text-fg-2">
          <Icon name="folder" size={14} className="shrink-0" />
          {rootName}/
        </p>
        <ul className="ml-[6px] border-l border-line-subtle pl-[14px]">
          {tree.map((node) => (
            <Node key={node.path} node={node} />
          ))}
        </ul>
      </div>
    </div>
  );
}

import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { cx } from "@/components/ui/styles";
import { getAgent, getCategory } from "@/lib/catalog/taxonomy";
import type { SetupSummary } from "@/types/catalog";

/** One listing: a cell in the ruled grid. The whole cell is a single link. */
export function SetupCell({ setup }: { setup: SetupSummary }) {
  const category = setup.categories[0] ? getCategory(setup.categories[0]).label : null;
  return (
    <article
      data-setup-cell
      className="group relative flex h-full flex-col border-b border-line px-4 py-5 transition-colors duration-150 ease-kit hover:bg-surface sm:px-6 md:border-r lg:px-6"
    >
      <p className="flex items-center justify-between gap-3 font-mono text-xs text-fg-2">
        <span className="truncate">{category}</span>
        <span className="flex shrink-0 items-center gap-2 tabular-nums">
          {setup.version ? `v${setup.version}` : "unversioned"}
          <Icon
            name="arrow-up-right"
            size={14}
            className="text-fg-3 transition duration-150 ease-kit group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-lime"
          />
        </span>
      </p>

      <h3 className="mt-3 text-[1.0625rem] leading-snug font-semibold tracking-[-0.015em] break-words">
        <Link href={`/setups/${setup.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-lime">
          {setup.name}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-fg-2">{setup.description}</p>

      <div className="mt-auto pt-5">
        <p className="font-mono text-xs leading-relaxed text-fg">
          <span className="sr-only">Declared for: </span>
          {setup.agents.map((id) => getAgent(id).name).join(" · ")}
        </p>
        <p className={cx("mt-2 flex flex-wrap gap-x-2.5 gap-y-1 border-t border-line-subtle pt-2.5 font-mono text-xs text-fg-2")}>
          <span className="uppercase">{setup.format}</span>
          <span aria-hidden="true">/</span>
          <span>{setup.license ?? "No licence stated"}</span>
          <span aria-hidden="true">/</span>
          <span>Free</span>
          <span aria-hidden="true">/</span>
          <span className="truncate">by {setup.creatorName}</span>
        </p>
      </div>
    </article>
  );
}

interface SetupGridProps {
  setups: readonly SetupSummary[];
  /** Column counts differ between a full-width grid and one beside the filter sidebar. */
  layout?: "full" | "beside-sidebar";
}

/** Draws only bottom and right rules; the parent supplies the top and left edges. */
export function SetupGrid({ setups, layout = "full" }: SetupGridProps) {
  return (
    <ul
      className={cx(
        "grid grid-cols-1 md:grid-cols-2 lg:-mr-px",
        layout === "full" ? "lg:grid-cols-3 wide:grid-cols-4" : "wide:grid-cols-3",
      )}
    >
      {setups.map((setup) => (
        <li key={setup.slug} className="min-w-0">
          <SetupCell setup={setup} />
        </li>
      ))}
    </ul>
  );
}

import { CodeBlock } from "@/components/ui/CodeBlock";
import type { DownloadAccess } from "@/lib/packages/access";

interface InstallStepsProps {
  access: DownloadAccess;
}

/**
 * Generic, honest install steps built from the real download. Anything specific to a
 * setup lives in its README above.
 */
export function InstallSteps({ access }: InstallStepsProps) {
  if (access.kind !== "free") {
    return <p className="text-sm text-fg-2">This listing has no working download, so there is nothing to install.</p>;
  }

  // GitHub names a HEAD archive at download time, so fall back to a visible placeholder.
  const fileName = access.fileName ?? "<downloaded-file>.zip";

  const steps: { title: string; body: string; blocks?: { label: string; code: string }[] }[] = [
    {
      title: "Look inside before extracting",
      body: "List the archive's contents and compare them with the file list on this page. The ZIP is the whole repository as it is right now, so it may have changed since the list was read.",
      blocks: [
        { label: "macOS / Linux", code: `unzip -l ${fileName}` },
        { label: "Windows PowerShell", code: `tar -tf ${fileName}` },
      ],
    },
    {
      title: "Extract somewhere neutral",
      body: "Extract outside your project first. A GitHub archive unpacks into a single folder named after the repository and branch.",
      blocks: [
        { label: "macOS / Linux", code: `unzip ${fileName} -d kitloom-inbox` },
        { label: "Windows PowerShell", code: `Expand-Archive ${fileName} -DestinationPath kitloom-inbox` },
      ],
    },
    {
      title: "Read, then copy what you want",
      body: "Open each file. Copy the ones you want into your project, merging with folders that already exist rather than replacing them. Follow the README for anything specific to this setup.",
    },
    {
      title: "Customise and commit",
      body: "Replace placeholders with facts about your project, remove what does not apply, and commit the result so your team gets the same setup.",
    },
  ];

  return (
    <ol className="space-y-7">
      {steps.map((step, index) => (
        <li key={step.title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3">
          <span aria-hidden="true" className="pt-0.5 font-mono text-xs text-fg-3 tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold">{step.title}</h3>
            <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-fg-2">{step.body}</p>
            {step.blocks ? (
              <div className="mt-3 grid gap-3 xl:grid-cols-2">
                {step.blocks.map((block) => (
                  <CodeBlock key={block.label} label={block.label} code={block.code} subject="Command" />
                ))}
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

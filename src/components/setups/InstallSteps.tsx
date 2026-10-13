import { CodeBlock } from "@/components/ui/CodeBlock";
import type { DownloadAccess } from "@/lib/packages/access";
import type { Setup } from "@/types/catalog";

interface InstallStepsProps {
  setup: Setup;
  access: DownloadAccess;
}

/**
 * Generic, honest install steps built from the package's real file name and checksum.
 * Package-specific instructions live in the README above.
 */
export function InstallSteps({ setup, access }: InstallStepsProps) {
  if (access.kind !== "free") {
    return (
      <p className="text-sm text-fg-2">
        This listing has no downloadable package yet, so there is nothing to install. Check the
        source repository if one is linked.
      </p>
    );
  }

  const { fileName } = access;
  const sha = setup.package.sha256;
  const steps: { title: string; body: string; blocks?: { label: string; code: string }[] }[] = [];

  if (sha) {
    steps.push({
      title: "Verify the download",
      body: "Compute the file's SHA-256 and compare it with the checksum on this page. They must match exactly. A match shows the file is the one that was listed; it says nothing about whether the contents are safe.",
      blocks: [
        { label: "macOS / Linux", code: `shasum -a 256 ${fileName}` },
        { label: "Windows PowerShell", code: `(Get-FileHash ${fileName} -Algorithm SHA256).Hash.ToLower()` },
      ],
    });
  }

  steps.push(
    {
      title: "Look inside before extracting",
      body: "List the archive's contents and compare them with the file manifest on this page.",
      blocks: [
        { label: "macOS / Linux", code: `unzip -l ${fileName}` },
        { label: "Windows PowerShell", code: `tar -tf ${fileName}` },
      ],
    },
    {
      title: "Extract somewhere neutral",
      body:
        setup.origin === "first-party"
          ? `Extract outside your project first. The archive unpacks into a single ${setup.slug}/ folder.`
          : "Extract outside your project first, into an empty folder, so nothing is overwritten by accident.",
      blocks: [
        { label: "macOS / Linux", code: `unzip ${fileName} -d kitloom-inbox` },
        { label: "Windows PowerShell", code: `Expand-Archive ${fileName} -DestinationPath kitloom-inbox` },
      ],
    },
    {
      title: "Read, then copy what you want",
      body: "Open each file. Copy the ones you want into your project, merging with folders that already exist rather than replacing them. Follow the README for anything specific to this kit.",
    },
    {
      title: "Customise and commit",
      body: "Replace placeholders with facts about your project, remove what does not apply, and commit the result so your team gets the same setup.",
    },
  );

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

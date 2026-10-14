"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { toast } from "sonner";

import { ScanReport } from "@/components/scan/ScanReport";
import { StitchSampler } from "@/components/scan/StitchSampler";
import { Icon } from "@/components/ui/Icon";
import { MOTION_OK } from "@/components/ui/Reveal";
import { buttonClass, cx } from "@/components/ui/styles";
import { HeddleError, runHeddle } from "@/lib/scan/heddle";
import { HEDDLE_VERSION, type HeddleReport, type Progress, type StageId } from "@/lib/scan/types";

const STAGES: readonly { id: StageId; label: string; note: string }[] = [
  { id: "resolve", label: "Pin the latest commit", note: "The download will be this exact commit, even if the creator pushes again." },
  { id: "map", label: "Map the file tree", note: "Every path in the repository at that commit." },
  { id: "structure", label: "Check names and file types", note: "Programs, links, nested archives, disguised names." },
  { id: "read", label: "Read every text file", note: "Line by line, against Heddle's rules. Nothing is run." },
  { id: "config", label: "Parse agent configuration", note: "Hooks, permissions, MCP servers, install scripts." },
  { id: "weigh", label: "Weigh the findings", note: "Severity, risk index and verdict." },
];

type State =
  | { phase: "scanning"; progress: Progress | null }
  | { phase: "done"; report: HeddleReport; progress: Progress | null }
  | { phase: "error"; error: HeddleError };

interface ScanDialogProps {
  repositoryUrl: string;
  /** Branch the listing follows ("HEAD" for the default branch). */
  gitRef: string;
  /** The unchecked branch archive, offered only if the check cannot run. */
  fallbackUrl: string;
  onClose: () => void;
}

/**
 * Heddle's modal: runs the scan, shows each stage as it happens, then the report and the
 * download — pinned to the commit that was checked.
 */
export function ScanDialog({ repositoryUrl, gitRef, fallbackUrl, onClose }: ScanDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const acceptId = useId();
  const [state, setState] = useState<State>({ phase: "scanning", progress: null });
  const [attempt, setAttempt] = useState(0);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    runHeddle({
      repositoryUrl,
      ref: gitRef,
      signal: controller.signal,
      // Copy the map: React only re-renders on a new reference.
      onProgress: (progress) => setState({ phase: "scanning", progress: { ...progress, flagged: new Map(progress.flagged) } }),
    }).then(
      (report) => setState((previous) => ({ phase: "done", report, progress: previous.phase === "scanning" ? previous.progress : null })),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ phase: "error", error: error instanceof HeddleError ? error : new HeddleError("unexpected", "The check stopped unexpectedly.") });
      },
    );
    return () => controller.abort();
  }, [repositoryUrl, gitRef, attempt]);

  useGSAP(
    () => {
      const element = dialog.current;
      if (!element) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(element, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" });
      });
    },
    { scope: dialog },
  );

  const progress = state.phase === "error" ? null : state.progress;
  const stageIndex = state.phase === "done" ? STAGES.length : progress ? STAGES.findIndex((stage) => stage.id === progress.stage) : 0;
  const readShare = progress && progress.total > 0 ? progress.done / progress.total : state.phase === "done" ? 1 : 0;

  const needsConsent = state.phase === "error" || (state.phase === "done" && (state.report.verdict === "caution" || state.report.verdict === "danger"));
  const canDownload = state.phase !== "scanning" && (!needsConsent || accepted);
  const downloadUrl = state.phase === "done" ? state.report.archiveUrl : fallbackUrl;

  function download() {
    toast.info("Download started from github.com", {
      description: "Scan it with your antivirus and read every file before using it.",
      duration: 7000,
    });
    dialog.current?.close();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(46rem,calc(100vw-2rem))] border border-line bg-carbon p-0 text-fg shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-[2px] open:flex open:flex-col"
    >
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="eyebrow text-lime">Heddle {HEDDLE_VERSION} · pre-download check</p>
          <h2 id={titleId} className="mt-1 text-h2 break-words">
            {state.phase === "done" ? `Checked ${state.report.repository}` : state.phase === "error" ? "The check could not finish" : "Checking before you download"}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          className="-mr-2 grid size-9 shrink-0 place-items-center rounded-xs text-fg-2 hover:bg-surface-2 hover:text-fg"
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="border border-line bg-surface">
          <StitchSampler
            stage={state.phase === "done" ? "done" : state.phase === "error" ? "idle" : (progress?.stage ?? "resolve")}
            progress={readShare}
            paths={progress?.paths ?? []}
            flagged={progress?.flagged ?? new Map()}
            verdict={state.phase === "done" ? state.report.verdict : null}
          />
        </div>

        {state.phase === "scanning" ? (
          <div className="mt-5">
            <ol className="space-y-px" aria-label="Scan stages">
              {STAGES.map((stage, index) => {
                const status = index < stageIndex ? "done" : index === stageIndex ? "active" : "waiting";
                return (
                  <li key={stage.id} className={cx("flex gap-3 py-1.5", status === "waiting" && "opacity-50")} aria-current={status === "active" ? "step" : undefined}>
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center" aria-hidden="true">
                      {status === "done" ? (
                        <Icon name="check" size={14} className="text-lime" />
                      ) : status === "active" ? (
                        <span className="size-2 animate-pulse bg-lime motion-reduce:animate-none" />
                      ) : (
                        <span className="size-1.5 bg-line-control" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                        <span className={cx("text-sm", status === "active" ? "font-semibold text-fg" : "text-fg-2")}>{stage.label}</span>
                        {stage.id === "read" && progress && progress.total > 0 && index <= stageIndex ? (
                          <span className="font-mono text-xs text-fg-2 tabular-nums">
                            {progress.done} / {progress.total}
                          </span>
                        ) : stage.id === "map" && progress && progress.paths.length > 0 ? (
                          <span className="font-mono text-xs text-fg-2 tabular-nums">{progress.paths.length} files</span>
                        ) : null}
                      </span>
                      {status === "active" ? <span className="mt-0.5 block text-xs text-fg-2">{stage.note}</span> : null}
                      {status === "active" && stage.id === "read" && progress?.current ? (
                        <span className="mt-1 block truncate font-mono text-xs text-fg-3">{progress.current}</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 font-mono text-xs text-fg-2 tabular-nums" aria-live="polite">
              {progress && progress.flagged.size > 0
                ? `${progress.flagged.size} ${progress.flagged.size === 1 ? "file" : "files"} flagged so far`
                : "No findings so far"}
            </p>
          </div>
        ) : null}

        {state.phase === "done" ? (
          <div className="mt-5">
            <ScanReport report={state.report} />
          </div>
        ) : null}

        {state.phase === "error" ? (
          <div className="mt-5 space-y-4">
            <div className="border border-line border-l-2 border-l-danger bg-surface px-4 py-3.5">
              <p className="eyebrow flex items-center gap-2 text-danger">
                <Icon name="alert" size={14} />
                Not checked
              </p>
              <p className="mt-2 text-sm leading-relaxed text-fg-2">{state.error.message}</p>
              {state.error.kind === "rate-limit" ? (
                <p className="mt-2 text-sm leading-relaxed text-fg-2">
                  GitHub allows 60 requests an hour from one network without signing in. Heddle needs
                  two. Try again later, or from another network.
                </p>
              ) : null}
            </div>
            <p className="text-sm leading-relaxed text-fg-2">
              You can still download the repository as it is now, but nothing in it has been
              checked. It may contain malware or harmful instructions. If you do, scan the ZIP with
              your antivirus, extract it into an empty folder and read every file before use.
            </p>
          </div>
        ) : null}
      </div>

      <footer className="border-t border-line px-5 py-4 sm:px-6">
        {needsConsent ? (
          <label htmlFor={acceptId} className="mb-4 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-fg-2">
            <input
              id={acceptId}
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 size-4 shrink-0 accent-[var(--color-lime)]"
            />
            {state.phase === "error"
              ? "I understand this download has not been checked, and I use it at my own risk."
              : "I have read the findings. I understand Heddle cannot catch everything, and I use this setup at my own risk."}
          </label>
        ) : null}
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
          {state.phase === "error" ? (
            <button
              type="button"
              onClick={() => {
                setAccepted(false);
                setState({ phase: "scanning", progress: null });
                setAttempt((n) => n + 1);
              }} className={buttonClass("secondary", "lg")}>
              Try again
            </button>
          ) : null}
          <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("secondary", "lg")}>
            {state.phase === "scanning" ? "Cancel" : "Close"}
          </button>
          {state.phase === "scanning" ? null : canDownload ? (
            <a href={downloadUrl} rel="noopener noreferrer" onClick={download} className={buttonClass("primary", "lg")}>
              <Icon name="download" size={18} />
              {state.phase === "error" ? "Download unchecked" : `Download commit ${state.report.commitSha.slice(0, 7)}`}
            </a>
          ) : (
            <button type="button" disabled className={buttonClass("primary", "lg", "cursor-not-allowed opacity-50")}>
              <Icon name="download" size={18} />
              {state.phase === "error" ? "Download unchecked" : "Download"}
            </button>
          )}
        </div>
        {state.phase === "done" ? (
          <p className="mt-3 text-right font-mono text-[0.6875rem] break-all text-fg-3">{state.report.fileName} · from github.com</p>
        ) : null}
      </footer>
    </dialog>
  );
}

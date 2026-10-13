export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const buttonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xs font-semibold whitespace-nowrap transition-colors duration-150 ease-kit";

const buttonVariants = {
  primary: "bg-lime text-carbon hover:bg-lime-strong",
  secondary: "border border-line-control text-fg hover:bg-surface-2 hover:border-fg-2",
} as const;

const buttonSizes = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
} as const;

/** Text inputs, selects and textareas share one look. See design.md §5 "Form field". */
export function inputClass(className?: string): string {
  return cx(
    "block w-full rounded-xs border border-line-control bg-surface px-3 py-2.5 text-[0.9375rem] text-fg placeholder:text-fg-2",
    "focus-visible:border-lime focus-visible:outline-offset-0 aria-[invalid=true]:border-danger read-only:text-fg-2",
    className,
  );
}

/** Class recipe shared by <button> and <a> so actions and links look identical. */
export function buttonClass(
  variant: keyof typeof buttonVariants = "secondary",
  size: keyof typeof buttonSizes = "md",
  className?: string,
): string {
  return cx(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

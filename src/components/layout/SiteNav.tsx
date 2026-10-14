"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

import { useGlide } from "@/components/motion/useGlide";
import { Icon } from "@/components/ui/Icon";
import { MOTION_OK } from "@/components/ui/Reveal";
import { buttonClass, cx } from "@/components/ui/styles";
import { useSession } from "@/lib/supabase/auth";

const LINKS = [
  { href: "/explore", label: "Explore", match: (path: string) => path.startsWith("/explore") || path.startsWith("/setups") },
  { href: "/agents", label: "Agents", match: (path: string) => path.startsWith("/agents") },
  { href: "/about", label: "About", match: (path: string) => path.startsWith("/about") },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const navGlide = useGlide<HTMLElement>("bottom");

  // Close the mobile menu whenever the route changes.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useGSAP(
    () => {
      if (!open) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          "[data-menu-item]",
          { opacity: 0, y: -6 },
          { opacity: 1, y: 0, duration: 0.18, ease: "power2.out", stagger: 0.03, clearProps: "all" },
        );
      });
    },
    { scope: panel, dependencies: [open] },
  );

  const publishCurrent = pathname.startsWith("/publish");
  const account =
    session !== "loading" && session !== null
      ? { href: "/account", label: "Account", current: pathname.startsWith("/account") }
      : { href: "/signin", label: "Sign in", current: pathname.startsWith("/signin") };

  return (
    <>
      <nav ref={navGlide} aria-label="Primary" className="hidden h-full items-stretch md:flex">
        {LINKS.map((link) => {
          const current = link.match(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              data-glide
              aria-current={current ? "page" : undefined}
              className={cx(
                "relative flex items-center px-3.5 text-sm transition-colors duration-150 ease-kit hover:text-fg",
                current ? "text-fg after:absolute after:inset-x-3.5 after:bottom-[-1px] after:h-0.5 after:bg-lime" : "text-fg-2",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {/* Reserved width while the session loads, so the header never shifts. */}
        <span className="hidden min-w-[4.5rem] justify-end md:flex">
          {session === "loading" ? null : (
            <Link
              href={account.href}
              aria-current={account.current ? "page" : undefined}
              className={cx("px-2 text-sm transition-colors duration-150 ease-kit hover:text-fg", account.current ? "text-fg" : "text-fg-2")}
            >
              {account.label}
            </Link>
          )}
        </span>
        <Link
          href="/publish"
          aria-current={publishCurrent ? "page" : undefined}
          className={buttonClass("secondary", "sm", cx("h-9 px-3.5 text-sm", publishCurrent && "border-lime"))}
        >
          Publish
        </Link>
        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
          className="flex h-9 w-9 items-center justify-center rounded-xs border border-line-control text-fg hover:bg-surface-2 md:hidden"
        >
          <Icon name={open ? "close" : "menu"} size={18} />
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      <div
        ref={panel}
        id="mobile-menu"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-carbon md:hidden"
      >
        <nav aria-label="Primary" className="flex flex-col">
          {LINKS.map((link) => {
            const current = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                data-menu-item
                aria-current={current ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cx(
                  "cell-x flex h-12 items-center justify-between border-t border-line-subtle text-[0.9375rem]",
                  current ? "border-l-2 border-l-lime text-fg" : "text-fg-2",
                )}
              >
                {link.label}
                <Icon name="arrow-right" size={16} className="text-fg-3" />
              </Link>
            );
          })}
          {session === "loading" ? null : (
            <Link
              href={account.href}
              data-menu-item
              aria-current={account.current ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cx(
                "cell-x flex h-12 items-center justify-between border-t border-line-subtle text-[0.9375rem]",
                account.current ? "border-l-2 border-l-lime text-fg" : "text-fg-2",
              )}
            >
              {account.label}
              <Icon name="arrow-right" size={16} className="text-fg-3" />
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}

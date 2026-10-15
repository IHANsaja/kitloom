import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Gutters } from "@/components/motion/Strings";
import { PurlPreloader } from "@/components/pet/PurlPreloader";
import { Toaster } from "@/components/ui/Toaster";
import { site } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — AI coding-agent setups you can inspect and download`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    url: site.url,
    title: `${site.name} — AI coding-agent setups you can inspect and download`,
    description: site.description,
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#111318",
  colorScheme: "dark",
};

// Marks the document as script-enabled before first paint, so entrance animations can
// pre-hide their items without ever hiding content from visitors without JavaScript.
// Also shows the Purl preloader only once per browser session.
const JS_FLAG =
  "var d=document.documentElement;d.classList.add('js');try{if(sessionStorage.getItem('kl-pre'))d.classList.add('kl-pre-seen');else sessionStorage.setItem('kl-pre','1')}catch(e){}";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: JS_FLAG }} />
        <PurlPreloader />
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-xs focus-visible:bg-lime focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-carbon"
        >
          Skip to content
        </a>
        <Gutters />
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

export const dynamic = "force-static";

// Setups live in the database and are rendered in the browser at /setup?slug=…, so a
// static sitemap can only list the fixed pages.
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/explore", "/agents", "/purl", "/publish", "/about"].map((path) => ({ url: `${site.url}${path}` }));
}

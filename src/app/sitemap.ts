import type { MetadataRoute } from "next";

import { getCatalog } from "@/lib/catalog";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/explore", "/publish", "/about"].map((path) => ({ url: `${site.url}${path}` }));
  const setups = getCatalog().setups.map((setup) => ({
    url: `${site.url}/setups/${setup.slug}`,
    lastModified: setup.updatedAt,
  }));
  return [...pages, ...setups];
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SetupDetail } from "@/components/setups/SetupDetail";
import { getAllSlugs, getSetupBySlug } from "@/lib/catalog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Static export: first-party kits are generated at build time; unknown slugs are 404s.
// Community setups live in the database and are rendered by /setup?slug=… instead.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const setup = getSetupBySlug(slug);
  if (!setup) return { title: "Setup not found" };
  return {
    title: setup.name,
    description: setup.description,
    alternates: { canonical: `/setups/${setup.slug}` },
    openGraph: { title: setup.name, description: setup.description, url: `/setups/${setup.slug}`, type: "article" },
  };
}

export default async function SetupPage({ params }: PageProps) {
  const { slug } = await params;
  const setup = getSetupBySlug(slug);
  if (!setup) notFound();
  return <SetupDetail setup={setup} />;
}

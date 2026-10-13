/**
 * Publishing boundary.
 *
 * Today a setup is published by pull request: the creator hosts the ZIP as a GitHub release
 * asset in their own repository and adds one record to src/data/setups.json. There is no
 * upload endpoint, and browser code can never hold credentials that could write to GitHub.
 *
 * A future authenticated publishing service would implement `SetupPublisher` on a trusted
 * backend. The Publish page is written against these types so it can grow a real form
 * later without the rest of the application changing.
 */
import type { Setup } from "@/types/catalog";

/** What a creator supplies. Everything else on a Setup is derived or assigned at review. */
export type SetupSubmission = Omit<Setup, "origin" | "downloads" | "featured">;

export type PublishResult =
  | { status: "submitted"; reviewUrl: string }
  | { status: "rejected"; errors: string[] };

export interface SetupPublisher {
  submit(submission: SetupSubmission): Promise<PublishResult>;
}

/** The record a contributor copies, fills in, and adds to the catalog by pull request. */
export const CATALOG_ENTRY_TEMPLATE = `{
  "id": "your-setup-slug",
  "slug": "your-setup-slug",
  "name": "Your Setup Name",
  "description": "One or two sentences: what it does and who it is for (20-280 characters).",
  "origin": "community",
  "creator": { "name": "Your name or handle", "url": "https://github.com/your-handle" },
  "agents": [
    { "id": "claude-code", "compatibility": "declared" }
  ],
  "categories": ["development-review"],
  "tags": ["lowercase", "no-spaces"],
  "version": "1.0.0",
  "releaseNotes": "Initial release.",
  "license": "MIT",
  "package": {
    "format": "zip",
    "downloadUrl": "https://github.com/your-handle/your-repo/releases/download/v1.0.0/your-setup-slug-1.0.0.zip",
    "sizeBytes": 0,
    "sha256": "paste the 64-character lowercase SHA-256 of the ZIP"
  },
  "repositoryUrl": "https://github.com/your-handle/your-repo",
  "readme": "# Your Setup Name\\n\\nPaste your README as a single JSON string, or use null.",
  "manifest": [
    { "path": "README.md", "sizeBytes": 0 },
    { "path": "AGENTS.md", "sizeBytes": 0 }
  ],
  "publishedAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "downloads": null,
  "featured": false
}`;

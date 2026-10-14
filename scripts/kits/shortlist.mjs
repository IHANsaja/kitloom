/**
 * Splits discovery/out/skills-index.json into one compact shortlist per setup theme, so a
 * helper designing a setup reads ~120 relevant skills instead of all of them.
 *   node scripts/kits/shortlist.mjs  →  discovery/kits/shortlists/<theme>.tsv
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../../discovery/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("out/skills-index.json", ROOT), "utf8"));

export const THEMES = {
  "nextjs-supabase": /next\.?js|react|supabase|postgres|tailwind|shadcn|vercel|typescript|full.?stack|frontend|api|auth|database|sql|deploy/i,
  "python-backend-data": /python|fastapi|django|flask|pandas|data|notebook|jupyter|sql|postgres|ml\b|machine learning|analysis|scrap|etl|pytest/i,
  "writing-docs": /writ|doc|readme|changelog|prose|humaniz|plain language|blog|article|edit|copy|technical writing|diagram|slides/i,
  "design-frontend": /design|ui\b|ux|css|tailwind|animation|gsap|motion|accessib|a11y|lighthouse|performance|web vitals|typograph|color|taste|figma|brand|logo/i,
  "testing-debugging": /test|tdd|debug|bug|qa\b|e2e|playwright|cypress|jest|vitest|coverage|regression|fix|root cause|browser/i,
  "code-review-security": /review|security|secure|vulnerab|audit|lint|quality|refactor|clean code|owasp|secret|dependency|pr\b|pull request/i,
  "spec-planning": /spec|plan|prd|requirement|architect|design doc|adr|roadmap|task|breakdown|brainstorm|scope|estimate|ralph|sdd/i,
  "productivity-knowledge": /note|obsidian|knowledge|memory|research|summar|second brain|wiki|learn|study|paper|handoff|session|reflect|journal|organi/i,
  "devops-cloud": /aws|terraform|docker|kubernetes|k8s|ci\b|cd\b|github actions|deploy|cloud|infra|devops|serverless|monitor|observab|nix/i,
  "marketing-seo": /seo|marketing|growth|ads|social|linkedin|content|copywrit|launch|landing|email|campaign|brand|geo\b|startup|sales/i,
  "mobile-apps": /mobile|ios|android|flutter|swift|kotlin|react native|expo|simulator|app store|xcode/i,
  "skill-builder": /skill|agent|prompt|meta|subagent|harness|claude\.md|agents\.md|context engineering|workflow|automation|mcp/i,
};

const out = new URL("kits/shortlists/", ROOT);
mkdirSync(out, { recursive: true });
const clean = (s) => String(s ?? "").replace(/[\t\r\n]+/g, " ").trim();

for (const [theme, pattern] of Object.entries(THEMES)) {
  const picks = index
    .filter((s) => pattern.test(`${s.name} ${s.description} ${s.dir}`))
    .filter((s) => s.description.length >= 20)
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 130);
  const lines = ["id\tname\tdescription\trepo\tlicense\tstars\theddle\tlines", ...picks.map((s) => [`${s.repo}#${s.dir}`, clean(s.name), clean(s.description).slice(0, 220), s.repo, s.license, s.stars, s.heddle, s.lines].join("\t"))];
  writeFileSync(new URL(`${theme}.tsv`, out), lines.join("\n"));
  console.log(`${theme}: ${picks.length}`);
}

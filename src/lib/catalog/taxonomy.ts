/**
 * The registry of agents and categories that catalog records may reference.
 * This module is dependency-free and safe to import from Client Components.
 */

export const AGENTS = [
  { id: "claude-code", name: "Claude Code", vendor: "Anthropic", primary: true },
  { id: "codex", name: "Codex", vendor: "OpenAI", primary: true },
  { id: "cursor", name: "Cursor", vendor: "Anysphere", primary: true },
  { id: "antigravity", name: "Antigravity", vendor: "Google", primary: true },
  { id: "gemini-cli", name: "Gemini CLI", vendor: "Google", primary: false },
  { id: "github-copilot", name: "GitHub Copilot", vendor: "GitHub", primary: false },
  { id: "windsurf", name: "Windsurf", vendor: "Cognition", primary: false },
  { id: "opencode", name: "opencode", vendor: "Open source", primary: false },
  { id: "aider", name: "Aider", vendor: "Open source", primary: false },
] as const;

export type AgentId = (typeof AGENTS)[number]["id"];
export type AgentDefinition = (typeof AGENTS)[number];

export const AGENT_IDS: readonly AgentId[] = AGENTS.map((agent) => agent.id);

export const PRIMARY_AGENTS = AGENTS.filter((agent) => agent.primary);

/** Filter values for agents: one of the primary agents, or everything else grouped as "other". */
export const OTHER_AGENTS_FILTER = "other";
export type AgentFilterId = AgentId | typeof OTHER_AGENTS_FILTER;

export const AGENT_FILTERS: readonly { id: AgentFilterId; label: string; hint: string }[] = [
  ...PRIMARY_AGENTS.map((agent) => ({ id: agent.id, label: agent.name, hint: agent.vendor })),
  {
    id: OTHER_AGENTS_FILTER,
    label: "Other agents",
    hint: AGENTS.filter((agent) => !agent.primary)
      .map((agent) => agent.name)
      .join(", "),
  },
];

export const CATEGORIES = [
  {
    id: "skills-workflows",
    label: "Skills & workflows",
    description: "Reusable skills, slash commands, and multi-step workflows an agent can invoke.",
  },
  {
    id: "development-review",
    label: "Development & code review",
    description: "Project instructions, coding rules, and review checklists.",
  },
  {
    id: "testing-debugging",
    label: "Testing & debugging",
    description: "Test-writing rules, reproduction loops, and debugging procedures.",
  },
  {
    id: "documentation",
    label: "Documentation",
    description: "Rules and skills for writing READMEs, references, and changelogs.",
  },
  {
    id: "productivity",
    label: "Productivity",
    description: "Hand-offs, planning, note-taking, and everyday workflow helpers.",
  },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type CategoryDefinition = (typeof CATEGORIES)[number];

export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((category) => category.id);

const agentsById = new Map<string, AgentDefinition>(AGENTS.map((agent) => [agent.id, agent]));
const categoriesById = new Map<string, CategoryDefinition>(
  CATEGORIES.map((category) => [category.id, category]),
);

export function isAgentId(value: string): value is AgentId {
  return agentsById.has(value);
}

export function isAgentFilterId(value: string): value is AgentFilterId {
  return AGENT_FILTERS.some((filter) => filter.id === value);
}

export function isCategoryId(value: string): value is CategoryId {
  return categoriesById.has(value);
}

export function getAgent(id: AgentId): AgentDefinition {
  const agent = agentsById.get(id);
  if (!agent) throw new Error(`Unknown agent id: ${id}`);
  return agent;
}

export function getCategory(id: CategoryId): CategoryDefinition {
  const category = categoriesById.get(id);
  if (!category) throw new Error(`Unknown category id: ${id}`);
  return category;
}

export function matchesAgentFilter(agentIds: readonly AgentId[], filter: AgentFilterId): boolean {
  if (filter === OTHER_AGENTS_FILTER) {
    return agentIds.some((id) => !getAgent(id).primary);
  }
  return agentIds.includes(filter);
}

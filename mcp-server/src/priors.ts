/* ──────────────────────────────────────────────────────────────
   NewCo AI Capability Baseline — Metadata prior lookup tables

   These functions translate raw opening-phase metadata (role,
   tools used, usage frequency) into prior anchors for the
   indicator state vector.

   Anchor mapping from SKILL.md section 5 shift magnitudes:
     +0.20 to +0.30  →  anchor 0.67  (Operational / Established)
     +0.10 to +0.15  →  anchor 0.33  (Aware / Emerging)
     -0.10           →  anchor 0.33  (mild negative — update math
                                       handles direction via the
                                       estimate shift formula)

   All 51 indicator IDs are drawn from SKILL.md section 2.
   ────────────────────────────────────────────────────────────── */

interface PriorEntry {
  indicator_id: string;
  anchor: number;
}

// ── Indicator ID constants by radar / dimension ─────────────

const TECHNICAL_ALL: string[] = [
  "technical.model_fundamentals.tokenisation_and_context",
  "technical.model_fundamentals.training_vs_inference",
  "technical.model_fundamentals.probabilistic_generation",
  "technical.prompting.system_vs_user_roles",
  "technical.prompting.few_shot_and_cot",
  "technical.prompting.structured_outputs",
  "technical.memory_retrieval.embeddings",
  "technical.memory_retrieval.rag",
  "technical.memory_retrieval.kv_cache",
  "technical.tool_use.function_calling",
  "technical.tool_use.mcp",
  "technical.tool_use.agentic_patterns",
  "technical.evals.eval_frameworks",
  "technical.evals.model_selection",
  "technical.evals.production_measurement",
];

const OPERATIONAL_ALL: string[] = [
  "operational.cli_tooling.terminal",
  "operational.cli_tooling.version_control",
  "operational.cli_tooling.ai_native_dev_tools",
  "operational.apis.direct_api_use",
  "operational.apis.cost_and_rate_awareness",
  "operational.apis.error_handling",
  "operational.mcp_integrations.mcp_server_use",
  "operational.mcp_integrations.connector_configuration",
  "operational.mcp_integrations.custom_integration",
  "operational.ai_code.code_generation",
  "operational.ai_code.code_review",
  "operational.ai_code.production_shipped",
  "operational.deployment.deployment",
  "operational.deployment.cost_latency_monitoring",
  "operational.deployment.eval_pipelines",
];

const BEHAVIORAL_ALL: string[] = [
  "behavioral.delegation.sets_explicit_goals",
  "behavioral.delegation.decides_task_fit",
  "behavioral.delegation.sets_collaboration_terms",
  "behavioral.description.provides_context",
  "behavioral.description.iterates_and_refines",
  "behavioral.description.specifies_format",
  "behavioral.discernment.questions_reasoning",
  "behavioral.discernment.identifies_missing_context",
  "behavioral.discernment.checks_facts",
  "behavioral.diligence.verifies_before_sharing",
  "behavioral.diligence.attributes_honestly",
  "behavioral.diligence.considers_downstream",
  "behavioral.governance.routes_data_correctly",
  "behavioral.governance.recognises_confidentiality_posture",
  "behavioral.governance.documents_ai_use",
  "behavioral.composition.configures_own_variant",
  "behavioral.composition.wires_multi_step_workflows",
  "behavioral.composition.orchestrates_across_tools",
  "behavioral.multiplier.teaches_colleagues",
  "behavioral.multiplier.shares_prompts_tools",
  "behavioral.multiplier.surfaces_edge_cases",
];

const OPERATIONAL_APIS: string[] = [
  "operational.apis.direct_api_use",
  "operational.apis.cost_and_rate_awareness",
  "operational.apis.error_handling",
];

const BEHAVIORAL_COMPOSITION: string[] = [
  "behavioral.composition.configures_own_variant",
  "behavioral.composition.wires_multi_step_workflows",
  "behavioral.composition.orchestrates_across_tools",
];

// ── Helpers ─────────────────────────────────────────────────

function withAnchor(ids: string[], anchor: number): PriorEntry[] {
  return ids.map((indicator_id) => ({ indicator_id, anchor }));
}

function lower(s: string): string {
  return s.toLowerCase().trim();
}

// ── Role-based priors ───────────────────────────────────────
//
// SKILL.md section 5, "Role-based prior shifts":
//
//   AI/ML engineer, platform engineer, applied AI lead
//     → Technical + Operational  +0.20–0.30  → anchor 0.67
//
//   Software engineer (non-AI)
//     → Operational  +0.15–0.20  → anchor 0.33
//
//   Technical PM, product engineer
//     → Technical  +0.10  → anchor 0.33
//
//   Director, VP, C-suite (non-technical)
//     → Behavioral  +0.05  — too small for a meaningful anchor;
//       omitted (default 0.50 baseline applies)
//
//   Knowledge worker (consultant, marketing, ops)
//     → no shift (default 0.50)
//

export function rolePriors(role: string): PriorEntry[] {
  const r = lower(role);

  // AI / ML / platform / applied-AI roles → strong Technical + Operational
  const aiKeywords = [
    "ai engineer",
    "ml engineer",
    "machine learning",
    "platform engineer",
    "applied ai",
    "ai lead",
    "ai architect",
    "data scientist",
    "mlops",
  ];
  if (aiKeywords.some((kw) => r.includes(kw))) {
    return [
      ...withAnchor(TECHNICAL_ALL, 0.67),
      ...withAnchor(OPERATIONAL_ALL, 0.67),
    ];
  }

  // Software engineer (non-AI) → moderate Operational
  const sweKeywords = [
    "software engineer",
    "software developer",
    "full stack",
    "fullstack",
    "frontend engineer",
    "backend engineer",
    "sre",
    "devops",
    "site reliability",
    "developer",
  ];
  if (sweKeywords.some((kw) => r.includes(kw))) {
    return withAnchor(OPERATIONAL_ALL, 0.33);
  }

  // Technical PM / product engineer → mild Technical
  const techPmKeywords = [
    "technical pm",
    "technical product",
    "product engineer",
    "tpm",
  ];
  if (techPmKeywords.some((kw) => r.includes(kw))) {
    return withAnchor(TECHNICAL_ALL, 0.33);
  }

  // Director / VP / C-suite — SKILL.md says +0.05 on Behavioral,
  // which is too small to meaningfully anchor. Return empty
  // (default 0.50 baseline stays). The tone calibration in the
  // skill handles the sophistication assumption separately.
  const seniorKeywords = [
    "director",
    "vp",
    "vice president",
    "c-suite",
    "ceo",
    "cto",
    "cio",
    "coo",
    "cfo",
    "chief",
    "partner",
    "managing director",
  ];
  if (seniorKeywords.some((kw) => r.includes(kw))) {
    return [];
  }

  // Knowledge worker (consultant, marketing, ops) — no shift
  return [];
}

// ── Tool-list priors ────────────────────────────────────────
//
// SKILL.md section 5, "Tool-list prior shifts":
//
//   API access (Bedrock, Claude API, OpenAI API)
//     → operational.apis.*  +0.20 each  → anchor 0.67
//
//   Claude Code, Cursor, Copilot, AI dev tools
//     → operational.cli_tooling.ai_native_dev_tools  +0.30  → anchor 0.67
//
//   Custom GPTs, Projects, custom assistants
//     → behavioral.composition.configures_own_variant  +0.30  → anchor 0.67
//
//   Granola, AI meeting tools
//     → behavioral.composition.orchestrates_across_tools  +0.15  → anchor 0.33
//
//   4+ distinct AI tools
//     → behavioral.composition.orchestrates_across_tools  +0.20  → anchor 0.67
//
//   Single tool only (e.g. just ChatGPT)
//     → behavioral.composition.*  -0.10  → anchor 0.33 (negative signal)
//
//   LangChain, LangGraph, CrewAI, Autogen
//     → technical.tool_use.agentic_patterns  +0.25  → anchor 0.67
//
//   Pinecone, Weaviate, Chroma
//     → technical.memory_retrieval.embeddings  +0.25  → anchor 0.67
//     → technical.memory_retrieval.rag  +0.25  → anchor 0.67
//

export function toolPriors(tool: string): PriorEntry[] {
  const t = lower(tool);

  const results: PriorEntry[] = [];
  const seen = new Set<string>();

  function add(indicator_id: string, anchor: number) {
    // When multiple tool signals hit the same indicator, keep the
    // stronger (higher) anchor. The caller typically invokes this
    // once per tool string and merges across the full tool list.
    const key = indicator_id;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({ indicator_id, anchor });
    }
  }

  function addAll(ids: string[], anchor: number) {
    for (const id of ids) add(id, anchor);
  }

  // API-level tools → operational.apis.* at 0.67
  const apiTools = [
    "bedrock",
    "claude api",
    "openai api",
    "aws sdk",
    "anthropic api",
    "anthropic sdk",
    "openai sdk",
  ];
  if (apiTools.some((kw) => t.includes(kw))) {
    addAll(OPERATIONAL_APIS, 0.67);
  }

  // AI-native dev tools → ai_native_dev_tools at 0.67
  const devTools = [
    "claude code",
    "cursor",
    "copilot",
    "github copilot",
    "continue",
    "cody",
    "aider",
    "windsurf",
  ];
  if (devTools.some((kw) => t.includes(kw))) {
    add("operational.cli_tooling.ai_native_dev_tools", 0.67);
  }

  // Custom GPTs / Projects / assistants → configures_own_variant at 0.67
  const customTools = [
    "custom gpt",
    "custom assistant",
    "gpt builder",
    "claude project",
    "projects",
    "gems",
  ];
  if (customTools.some((kw) => t.includes(kw))) {
    add("behavioral.composition.configures_own_variant", 0.67);
  }

  // AI meeting / note tools → orchestrates_across_tools at 0.33
  const meetingTools = [
    "granola",
    "otter",
    "fireflies",
    "read.ai",
    "fathom",
    "krisp",
  ];
  if (meetingTools.some((kw) => t.includes(kw))) {
    add("behavioral.composition.orchestrates_across_tools", 0.33);
  }

  // Agentic frameworks → agentic_patterns at 0.67
  const agenticTools = [
    "langchain",
    "langgraph",
    "crewai",
    "autogen",
    "semantic kernel",
    "haystack",
  ];
  if (agenticTools.some((kw) => t.includes(kw))) {
    add("technical.tool_use.agentic_patterns", 0.67);
  }

  // Vector DB / RAG tools → embeddings + rag at 0.67
  const vectorTools = [
    "pinecone",
    "weaviate",
    "chroma",
    "chromadb",
    "qdrant",
    "milvus",
    "pgvector",
    "faiss",
  ];
  if (vectorTools.some((kw) => t.includes(kw))) {
    add("technical.memory_retrieval.embeddings", 0.67);
    add("technical.memory_retrieval.rag", 0.67);
  }

  return results;
}

/**
 * Compute combined tool priors from an entire tool list.
 *
 * Merges per-tool priors and applies the "4+ distinct tools"
 * and "single tool only" rules from SKILL.md section 5.
 *
 * Not exported as part of the three-function contract, but
 * useful for callers that have the full list up front.
 */
export function mergedToolPriors(tools: string[]): PriorEntry[] {
  const map = new Map<string, number>();

  for (const tool of tools) {
    for (const entry of toolPriors(tool)) {
      const existing = map.get(entry.indicator_id);
      // Keep the stronger anchor when multiple tools hit the same indicator
      if (existing === undefined || entry.anchor > existing) {
        map.set(entry.indicator_id, entry.anchor);
      }
    }
  }

  // 4+ distinct tools → orchestrates_across_tools at 0.67
  const distinctCount = new Set(tools.map(lower)).size;
  if (distinctCount >= 4) {
    const existing = map.get("behavioral.composition.orchestrates_across_tools");
    if (existing === undefined || 0.67 > existing) {
      map.set("behavioral.composition.orchestrates_across_tools", 0.67);
    }
  }

  // Single tool only → behavioral.composition.* at 0.33 (negative signal)
  if (distinctCount === 1) {
    for (const id of BEHAVIORAL_COMPOSITION) {
      if (!map.has(id)) {
        map.set(id, 0.33);
      }
    }
  }

  return Array.from(map.entries()).map(([indicator_id, anchor]) => ({
    indicator_id,
    anchor,
  }));
}

// ── Frequency priors ────────────────────────────────────────
//
// SKILL.md section 5, "Frequency prior shifts":
//
//   Daily / multiple times
//     → Broadly +0.10 across Behavioral  → anchor 0.33
//
//   Weekly
//     → No shift
//
//   Monthly or less
//     → Behavioral cap at ~0.50 (no shift; the ceiling is
//       enforced by the scoring engine, not the prior anchor)
//

type FrequencyBucket = "daily" | "weekly" | "monthly_or_less";

function normalizeFrequency(raw: string): FrequencyBucket {
  const f = lower(raw);

  if (
    f.includes("daily") ||
    f.includes("multiple times") ||
    f.includes("every day") ||
    f.includes("all the time") ||
    f.includes("constantly")
  ) {
    return "daily";
  }

  if (f.includes("weekly") || f.includes("few times a week") || f.includes("once a week")) {
    return "weekly";
  }

  // Everything else: monthly, rarely, less, occasionally, etc.
  return "monthly_or_less";
}

export function frequencyPriors(frequency: string): PriorEntry[] {
  const bucket = normalizeFrequency(frequency);

  switch (bucket) {
    case "daily":
      // +0.10 broadly across Behavioral → anchor 0.33 (Aware/Emerging)
      return withAnchor(BEHAVIORAL_ALL, 0.33);

    case "weekly":
      // No shift
      return [];

    case "monthly_or_less":
      // No shift from priors. The ~0.50 ceiling on Behavioral is enforced
      // by the scoring engine during incidental probing, not here.
      return [];
  }
}

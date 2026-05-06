import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SessionStorage } from "./storage.js";
import {
  recordEvidence,
  computeStateVector,
  selectNextProbe,
  generateSummarySkeleton,
} from "./math.js";
import { rolePriors, toolPriors, frequencyPriors } from "./priors.js";
import type { SessionState, BetaState, Evidence } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, "..", "src", "indicators.json");
const registry = JSON.parse(readFileSync(registryPath, "utf-8")) as {
  version: string;
  indicators: string[];
};
const validIndicators = new Set(registry.indicators);

const storage = new SessionStorage(process.env.BASELINE_DATA_DIR);

// ── In-memory session store ─────────────────────────
const SESSIONS = new Map<string, SessionState>();

const server = new McpServer({
  name: "newco-baseline",
  version: "1.0.0",
});

function sessionNotFound() {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify({ error: "Session not found" }) },
    ],
    isError: true,
  };
}

function sessionFinalized() {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify({ error: "Session already finalized" }) },
    ],
    isError: true,
  };
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

// ── Tool 1: start_baseline_session ──────────────────

server.tool(
  "start_baseline_session",
  "Begin a new Bayesian assessment session. Creates Beta(1,1) priors for all 51 indicators. Returns session_id and initial state_vector.",
  {
    user_id: z.string().describe("Unique identifier for the respondent"),
    name: z.string().describe("Respondent's name"),
    role: z.string().describe("Respondent's role / job title"),
    organisation: z.string().optional().describe("Organisation name"),
  },
  async ({ user_id, name, role, organisation }) => {
    const session_id = randomUUID();

    const indicators: Record<string, BetaState> = {};
    for (const id of registry.indicators) {
      indicators[id] = {
        indicator_id: id,
        alpha: 1.0,
        beta: 1.0,
        evidence_log: [],
      };
    }

    const session: SessionState = {
      session_id,
      user_id,
      user_metadata: { name, role, organisation },
      indicators,
      start_time: new Date().toISOString(),
    };

    SESSIONS.set(session_id, session);

    return ok({
      session_id,
      state_vector: computeStateVector(session),
    });
  }
);

// ── Tool 2: apply_metadata_priors ───────────────────

server.tool(
  "apply_metadata_priors",
  "Apply Bayesian priors from respondent metadata (role, tools, frequency). Call once after start_baseline_session. Returns updated state_vector.",
  {
    session_id: z.string().describe("Session ID from start_baseline_session"),
    role: z.string().describe("Respondent's role, as stated"),
    tools_used: z.array(z.string()).describe("AI tools the respondent uses"),
    frequency: z.string().describe("How often they use AI tools (daily, weekly, less)"),
  },
  async ({ session_id, role, tools_used, frequency }) => {
    const session = SESSIONS.get(session_id);
    if (!session) return sessionNotFound();
    if (session.completion_state) return sessionFinalized();

    session.tools_used = tools_used;
    session.frequency = frequency;

    // Apply role priors
    for (const { indicator_id, anchor } of rolePriors(role)) {
      if (!validIndicators.has(indicator_id)) continue;
      recordEvidence(session, {
        indicator_id,
        anchor,
        strength: 1,
        source: "metadata",
        quote: `role: ${role}`,
        turn: 0,
      });
    }

    // Apply tool priors
    for (const tool of tools_used) {
      for (const { indicator_id, anchor } of toolPriors(tool)) {
        if (!validIndicators.has(indicator_id)) continue;
        recordEvidence(session, {
          indicator_id,
          anchor,
          strength: 1,
          source: "metadata",
          quote: `uses: ${tool}`,
          turn: 0,
        });
      }
    }

    // Apply frequency priors
    for (const { indicator_id, anchor } of frequencyPriors(frequency)) {
      if (!validIndicators.has(indicator_id)) continue;
      recordEvidence(session, {
        indicator_id,
        anchor,
        strength: 1,
        source: "metadata",
        quote: `frequency: ${frequency}`,
        turn: 0,
      });
    }

    return ok({ state_vector: computeStateVector(session) });
  }
);

// ── Tool 3: record_evidence ─────────────────────────

server.tool(
  "record_evidence",
  "Record a Bayesian evidence update for one indicator. Call once per affected indicator per respondent turn. Server applies the update, propagates correlations, and returns the updated state_vector with propagation log.",
  {
    session_id: z.string().describe("Session ID"),
    indicator_id: z.string().describe("Dot-notation indicator ID"),
    anchor: z
      .number()
      .describe("Anchor value: 0 (absent), 0.33 (aware), 0.67 (operational), 1.00 (expert)"),
    strength: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .describe("Evidence strength: 1=weak, 2=medium, 3=strong"),
    source: z
      .enum(["direct", "incidental", "metadata"])
      .describe("How this evidence was obtained"),
    quote: z
      .string()
      .max(200)
      .describe("Verbatim quote or behavioral description, max 200 chars"),
    turn: z.number().int().min(0).describe("Current respondent turn number"),
    probe_id: z.string().optional().describe("Probe ID if source is direct or incidental"),
  },
  async ({ session_id, indicator_id, anchor, strength, source, quote, turn, probe_id }) => {
    const session = SESSIONS.get(session_id);
    if (!session) return sessionNotFound();
    if (session.completion_state) return sessionFinalized();

    if (!validIndicators.has(indicator_id)) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: `Unknown indicator_id: ${indicator_id}`,
            }),
          },
        ],
        isError: true,
      };
    }

    const evidence: Evidence = {
      indicator_id,
      anchor,
      strength: strength as 1 | 2 | 3,
      source,
      quote,
      turn,
      probe_id,
    };

    const result = recordEvidence(session, evidence);

    return ok({
      state_vector: result.state_vector,
      propagation_log: result.propagation_log,
    });
  }
);

// ── Tool 4: select_next_probe ───────────────────────

server.tool(
  "select_next_probe",
  "Select the next probe using Expected Information Gain approximation. Returns ranked probes and stopping recommendations. Call between respondent turns.",
  {
    session_id: z.string().describe("Session ID"),
    asked_probes: z
      .array(z.string())
      .describe("Probe IDs already asked this session"),
    time_remaining_minutes: z
      .number()
      .describe("Estimated minutes remaining in the session"),
  },
  async ({ session_id, asked_probes, time_remaining_minutes }) => {
    const session = SESSIONS.get(session_id);
    if (!session) return sessionNotFound();

    const result = selectNextProbe(session, asked_probes, time_remaining_minutes);
    return ok(result);
  }
);

// ── Tool 5: generate_summary_skeleton ───────────────

server.tool(
  "generate_summary_skeleton",
  "Compute the final summary data: radar means, strengths, growth areas, coverage breakdown, quality flags. Call once before rendering the personal summary to the respondent.",
  {
    session_id: z.string().describe("Session ID"),
  },
  async ({ session_id }) => {
    const session = SESSIONS.get(session_id);
    if (!session) return sessionNotFound();

    const skeleton = generateSummarySkeleton(session);
    return ok(skeleton);
  }
);

// ── Tool 6: finalize_session ────────────────────────

server.tool(
  "finalize_session",
  "Finalize the session: write the full state blob to durable storage and release server memory. Call as the very last action.",
  {
    session_id: z.string().describe("Session ID"),
    completion_state: z
      .enum(["complete", "partial", "stopped"])
      .describe("How the session ended"),
    consent_to_share_with_org: z
      .boolean()
      .describe("Whether respondent consents to sharing results with org leadership"),
    summary_text: z
      .string()
      .optional()
      .describe("The rendered personal summary text"),
  },
  async ({ session_id, completion_state, consent_to_share_with_org, summary_text }) => {
    const session = SESSIONS.get(session_id);
    if (!session) return sessionNotFound();

    session.end_time = new Date().toISOString();
    session.completion_state = completion_state;
    session.consent_to_share_with_org = consent_to_share_with_org;
    if (summary_text) session.summary_text = summary_text;

    // Compute final summary skeleton for persistence
    const skeleton = generateSummarySkeleton(session);

    const blob = {
      session_id: session.session_id,
      user_id: session.user_id,
      user_metadata: session.user_metadata,
      tools_used: session.tools_used,
      frequency: session.frequency,
      start_time: session.start_time,
      end_time: session.end_time,
      completion_state,
      consent_to_share_with_org,
      summary_text: summary_text ?? null,
      summary: skeleton,
      indicators: Object.fromEntries(
        Object.entries(session.indicators).map(([id, s]) => [
          id,
          {
            alpha: s.alpha,
            beta: s.beta,
            mean: s.alpha / (s.alpha + s.beta),
            confidence: Math.max(0, (s.alpha + s.beta - 2) / (s.alpha + s.beta - 2 + 3)),
            evidence_log: s.evidence_log,
          },
        ])
      ),
    };

    const record_uri = await storage.writeSessionBlob(session_id, blob);

    // Release memory
    SESSIONS.delete(session_id);

    return ok({
      record_uri,
      completion_state,
      indicators_scored: 51 - skeleton.coverage_breakdown.unscored,
      total_indicators: 51,
      summary: skeleton,
    });
  }
);

// ── Start ───────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NewCo Baseline MCP server v1.0.0 (Bayesian) running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

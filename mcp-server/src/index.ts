import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SessionStorage } from "./storage.js";
import type { Session, Checkpoint } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, "..", "src", "indicators.json");
const registry = JSON.parse(readFileSync(registryPath, "utf-8")) as {
  version: string;
  indicators: string[];
};
const validIndicators = new Set(registry.indicators);

const storage = new SessionStorage(process.env.BASELINE_DATA_DIR);

const server = new McpServer({
  name: "newco-baseline",
  version: "0.2.0",
});

function sessionNotFound() {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify({ error: "Session not found" }) },
    ],
    isError: true,
  };
}

// Tool 1: start_baseline_session
server.tool(
  "start_baseline_session",
  "Begin a new AI Capability Baseline assessment session. Call this once at the start of each assessment.",
  {
    user_id: z.string().describe("Unique identifier for the respondent"),
    user_metadata: z
      .object({
        name: z.string().describe("Respondent's name"),
        role: z.string().describe("Respondent's role / job title"),
        tenure_months: z.number().optional().describe("Months in current role"),
        organisation: z.string().optional().describe("Organisation name"),
      })
      .describe("Respondent metadata"),
  },
  async ({ user_id, user_metadata }) => {
    const session_id = randomUUID();
    const session: Session = {
      session_id,
      user_id,
      user_metadata,
      indicator_scores: {},
      checkpoints: [],
      start_time: new Date().toISOString(),
    };
    await storage.save(session);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ session_id }) }],
    };
  }
);

// Tool 2: log_metadata
server.tool(
  "log_metadata",
  "Log session metadata captured during the opening phase (tools used, frequency, etc.).",
  {
    session_id: z.string().describe("Session ID from start_baseline_session"),
    metadata: z
      .object({
        tools_used: z.array(z.string()).describe("AI tools the respondent uses"),
        frequency: z
          .string()
          .describe("How often they use AI tools (daily, weekly, less)"),
      })
      .passthrough()
      .describe("Session metadata"),
  },
  async ({ session_id, metadata }) => {
    const session = await storage.load(session_id);
    if (!session) return sessionNotFound();
    session.session_metadata = metadata;
    await storage.save(session);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ ok: true }) }],
    };
  }
);

// Tool 3: log_indicator_updates (v2 — batched)
server.tool(
  "log_indicator_updates",
  "Log a batch of indicator updates accumulated since the last checkpoint. Call every N turns (default 10) and unconditionally before finalize_session.",
  {
    session_id: z.string().describe("Session ID from start_baseline_session"),
    checkpoint_reason: z
      .enum(["scheduled", "manual", "pre_finalize"])
      .default("scheduled")
      .describe("Why this checkpoint was triggered"),
    turn_number: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        "Approximate respondent turn count at checkpoint time. Optional; useful for downstream analysis."
      ),
    updates: z
      .array(
        z.object({
          indicator_id: z
            .string()
            .describe(
              "Dot-notation indicator ID, e.g. 'behavioral.delegation.sets_explicit_goals'"
            ),
          estimate: z.number().min(0).max(1),
          confidence: z.number().min(0).max(1),
          evidence: z
            .string()
            .describe("Verbatim quote when available; behavioral description otherwise."),
          inference_type: z.enum(["direct", "correlated"]),
        })
      )
      .min(1)
      .max(100)
      .describe("Array of indicator updates to persist"),
  },
  async ({ session_id, checkpoint_reason, turn_number, updates }) => {
    const session = await storage.load(session_id);
    if (!session) return sessionNotFound();

    if (session.completion_state) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "Session already finalized",
              completion_state: session.completion_state,
            }),
          },
        ],
        isError: true,
      };
    }

    const warnings: string[] = [];
    const validUpdates = updates.filter((u) => {
      if (!validIndicators.has(u.indicator_id)) {
        warnings.push(`Unknown indicator_id dropped: ${u.indicator_id}`);
        return false;
      }
      return true;
    });

    const checkpoint: Checkpoint = {
      checkpoint_id: randomUUID(),
      checkpoint_reason,
      turn_number,
      timestamp: new Date().toISOString(),
      updates: validUpdates,
    };

    storage.appendCheckpoint(session, checkpoint);
    await storage.save(session);

    const result: Record<string, unknown> = {
      ok: true,
      checkpoint_id: checkpoint.checkpoint_id,
      indicators_recorded: validUpdates.length,
    };
    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

// Tool 3 (deprecated): log_indicator_update (singular)
server.tool(
  "log_indicator_update",
  "[DEPRECATED — use log_indicator_updates] Log a score update for a single indicator.",
  {
    session_id: z.string().describe("Session ID"),
    indicator_id: z
      .string()
      .describe(
        "Dot-notation indicator ID, e.g. 'behavioral.delegation.sets_explicit_goals'"
      ),
    estimate: z.number().min(0).max(1).describe("Current best estimate (0.00-1.00)"),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe("Confidence in this estimate (0.00-1.00)"),
    evidence: z
      .string()
      .describe("Verbatim quote or behavioral description supporting this score"),
    inference_type: z
      .enum(["direct", "correlated"])
      .describe("Whether this was directly probed or inferred via correlation"),
  },
  async ({
    session_id,
    indicator_id,
    estimate,
    confidence,
    evidence,
    inference_type,
  }) => {
    const session = await storage.load(session_id);
    if (!session) return sessionNotFound();

    if (session.completion_state) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: "Session already finalized",
              completion_state: session.completion_state,
            }),
          },
        ],
        isError: true,
      };
    }

    const warnings: string[] = [];
    if (!validIndicators.has(indicator_id)) {
      warnings.push(`Unknown indicator_id: ${indicator_id}`);
    }

    const checkpoint: Checkpoint = {
      checkpoint_id: randomUUID(),
      checkpoint_reason: "manual",
      timestamp: new Date().toISOString(),
      updates: [{ indicator_id, estimate, confidence, evidence, inference_type }],
    };

    storage.appendCheckpoint(session, checkpoint);
    await storage.save(session);

    console.error(
      `[DEPRECATION] log_indicator_update called for session ${session_id}. Use log_indicator_updates instead.`
    );

    const result: Record<string, unknown> = {
      ok: true,
      deprecated: true,
      use_instead: "log_indicator_updates",
    };
    if (warnings.length > 0) {
      result.warnings = warnings;
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  }
);

// Tool 4: log_classification_summary
server.tool(
  "log_classification_summary",
  "Log the final classification summary after scoring is complete. Call once before finalize_session.",
  {
    session_id: z.string().describe("Session ID"),
    radar_means: z
      .object({
        behavioral: z.number().min(0).max(1),
        technical: z.number().min(0).max(1),
        operational: z.number().min(0).max(1),
      })
      .describe("Mean scores per radar (0.00-1.00)"),
    strengths: z
      .array(z.string())
      .describe("Top 3 indicator IDs by confidence-weighted score"),
    growth_areas: z
      .array(z.string())
      .describe("Bottom 2 high-leverage indicator IDs"),
    practice_suggestion: z
      .string()
      .describe("One specific practice to try this week"),
  },
  async ({ session_id, radar_means, strengths, growth_areas, practice_suggestion }) => {
    const session = await storage.load(session_id);
    if (!session) return sessionNotFound();
    session.summary = { radar_means, strengths, growth_areas, practice_suggestion };
    await storage.save(session);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ ok: true }) }],
    };
  }
);

// Tool 5: finalize_session
server.tool(
  "finalize_session",
  "Finalize and close the assessment session. Call as the last step after summary is generated.",
  {
    session_id: z.string().describe("Session ID"),
    duration_minutes: z
      .number()
      .describe("Total session duration in minutes"),
    completion_state: z
      .enum(["complete", "partial", "stopped"])
      .describe("How the session ended"),
    consent_to_share_with_org: z
      .boolean()
      .describe("Whether respondent consents to sharing results with org leadership"),
  },
  async ({
    session_id,
    duration_minutes,
    completion_state,
    consent_to_share_with_org,
  }) => {
    const session = await storage.load(session_id);
    if (!session) return sessionNotFound();
    session.end_time = new Date().toISOString();
    session.duration_minutes = duration_minutes;
    session.completion_state = completion_state;
    session.consent_to_share_with_org = consent_to_share_with_org;
    await storage.save(session);

    const record_uri = `file://${process.cwd()}/data/sessions/${session_id}.json`;
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ record_uri }) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NewCo Baseline MCP server v0.2.0 running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

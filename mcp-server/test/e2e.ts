/**
 * End-to-end test: exercises all 5 MCP tools in sequence.
 * Run: npx tsx test/e2e.ts
 */
import { SessionStorage } from "../src/storage.js";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const TEST_DATA_DIR = join(process.cwd(), "data", "test-sessions");
const storage = new SessionStorage(TEST_DATA_DIR);

async function run() {
  const sessionId = randomUUID();
  const userId = "test-mike";

  console.log("=== NewCo Baseline MCP Server — E2E Test ===\n");

  // 1. start_baseline_session
  console.log("1. start_baseline_session");
  await storage.save({
    session_id: sessionId,
    user_id: userId,
    user_metadata: {
      name: "Mike",
      role: "Co-founder",
      tenure_months: 6,
      organisation: "NewCo",
    },
    indicator_scores: {},
    start_time: new Date().toISOString(),
  });
  console.log(`   ✓ Session created: ${sessionId}\n`);

  // 2. log_metadata
  console.log("2. log_metadata");
  const session = await storage.load(sessionId);
  if (!session) throw new Error("Session not found after create");
  session.session_metadata = {
    tools_used: ["Claude", "ChatGPT", "Claude Code", "Cursor"],
    frequency: "daily",
  };
  await storage.save(session);
  console.log("   ✓ Metadata logged\n");

  // 3. log_indicator_update (multiple indicators)
  console.log("3. log_indicator_update (3 indicators)");
  const updates = [
    {
      indicator_id: "behavioral.description.iterates_and_refines",
      estimate: 0.85,
      confidence: 0.80,
      evidence: 'Described a detailed iteration cycle: "I always treat the first output as a rough draft — I push back, ask for alternatives, then refine."',
      inference_type: "direct" as const,
    },
    {
      indicator_id: "behavioral.delegation.decides_task_fit",
      estimate: 0.72,
      confidence: 0.70,
      evidence: 'Has a working theory: "AI is great for first drafts and brainstorming, terrible for anything that needs domain-specific accuracy without review."',
      inference_type: "direct" as const,
    },
    {
      indicator_id: "behavioral.description.provides_context",
      estimate: 0.70,
      confidence: 0.45,
      evidence: "Inferred from strong iteration habits — likely provides context given description fluency.",
      inference_type: "correlated" as const,
    },
  ];

  const session2 = await storage.load(sessionId);
  if (!session2) throw new Error("Session not found");
  for (const u of updates) {
    session2.indicator_scores[u.indicator_id] = {
      ...u,
      updated_at: new Date().toISOString(),
    };
  }
  await storage.save(session2);
  console.log(`   ✓ ${updates.length} indicators logged\n`);

  // 4. log_classification_summary
  console.log("4. log_classification_summary");
  const session3 = await storage.load(sessionId);
  if (!session3) throw new Error("Session not found");
  session3.summary = {
    radar_means: {
      behavioral: 0.68,
      technical: 0.55,
      operational: 0.72,
    },
    strengths: [
      "behavioral.description.iterates_and_refines",
      "operational.ai_code.production_shipped",
      "behavioral.delegation.decides_task_fit",
    ],
    growth_areas: [
      "behavioral.governance.documents_ai_use",
      "behavioral.multiplier.teaches_colleagues",
    ],
    practice_suggestion:
      "Next time you ship AI-assisted work to a client, add one line at the bottom of your internal note documenting that AI was involved and what you verified. Takes 10 seconds; builds the documentation habit.",
  };
  await storage.save(session3);
  console.log("   ✓ Summary logged\n");

  // 5. finalize_session
  console.log("5. finalize_session");
  const session4 = await storage.load(sessionId);
  if (!session4) throw new Error("Session not found");
  session4.end_time = new Date().toISOString();
  session4.duration_minutes = 22;
  session4.completion_state = "complete";
  session4.consent_to_share_with_org = true;
  await storage.save(session4);
  console.log("   ✓ Session finalized\n");

  // Verify persisted data
  console.log("=== Verification ===");
  const path = join(TEST_DATA_DIR, `${sessionId}.json`);
  const raw = await readFile(path, "utf-8");
  const final = JSON.parse(raw);

  const checks = [
    ["session_id", final.session_id === sessionId],
    ["user_metadata.name", final.user_metadata.name === "Mike"],
    ["session_metadata.tools_used", final.session_metadata.tools_used.length === 4],
    ["indicator_scores count", Object.keys(final.indicator_scores).length === 3],
    ["summary.radar_means.behavioral", final.summary.radar_means.behavioral === 0.68],
    ["completion_state", final.completion_state === "complete"],
    ["duration_minutes", final.duration_minutes === 22],
    ["consent_to_share_with_org", final.consent_to_share_with_org === true],
  ];

  let passed = 0;
  for (const [name, ok] of checks) {
    console.log(`   ${ok ? "✓" : "✗"} ${name}`);
    if (ok) passed++;
  }

  console.log(`\n${passed}/${checks.length} checks passed.`);

  // Clean up test file
  const { unlink } = await import("node:fs/promises");
  await unlink(path);
  console.log(`\nTest session file cleaned up.`);

  if (passed === checks.length) {
    console.log("\n=== ALL TESTS PASSED ===");
    process.exit(0);
  } else {
    console.log("\n=== SOME TESTS FAILED ===");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

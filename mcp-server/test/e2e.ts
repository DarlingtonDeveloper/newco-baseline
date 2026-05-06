/**
 * End-to-end tests for NewCo Baseline Bayesian MCP server v1.0.
 * Tests Beta math, correlation propagation, probe selection, and summary generation.
 * Run: npx tsx test/e2e.ts
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  betaMean,
  betaVariance,
  effectiveSampleSize,
  confidence,
  recordEvidence,
  computeStateVector,
  selectNextProbe,
  generateSummarySkeleton,
  computeRadarMean,
  hasDirectEvidence,
  primarySource,
} from "../src/math.js";
import { CORRELATION_MATRIX } from "../src/correlations.js";
import { PROBE_LIBRARY, INDICATOR_IMPORTANCE } from "../src/probes.js";
import { rolePriors, toolPriors, frequencyPriors } from "../src/priors.js";
import { SessionStorage } from "../src/storage.js";
import type { SessionState, BetaState, Evidence } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = join(__dirname, "..", "src", "indicators.json");
const registry = JSON.parse(readFileSync(registryPath, "utf-8")) as {
  version: string;
  indicators: string[];
};

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean) {
  if (condition) {
    console.log(`   + ${name}`);
    passed++;
  } else {
    console.log(`   X ${name}`);
    failed++;
  }
}

function approx(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) < tolerance;
}

function createSession(): SessionState {
  const indicators: Record<string, BetaState> = {};
  for (const id of registry.indicators) {
    indicators[id] = {
      indicator_id: id,
      alpha: 1.0,
      beta: 1.0,
      evidence_log: [],
    };
  }
  return {
    session_id: randomUUID(),
    user_id: "test-user",
    user_metadata: { name: "Test User", role: "Engineer" },
    indicators,
    start_time: new Date().toISOString(),
  };
}

// ── Test groups ─────────────────────────────────────

async function testBetaMath() {
  console.log("\n Beta distribution math");

  // Beta(1,1) — uniform prior
  const uniform: BetaState = { indicator_id: "test", alpha: 1, beta: 1, evidence_log: [] };
  assert("Beta(1,1) mean = 0.5", approx(betaMean(uniform), 0.5));
  assert("Beta(1,1) effective n = 0", approx(effectiveSampleSize(uniform), 0));
  assert("Beta(1,1) confidence = 0", approx(confidence(uniform), 0));
  assert("Beta(1,1) variance = 0.083", approx(betaVariance(uniform), 0.083, 0.001));

  // Beta(4,1) — strong high evidence
  const high: BetaState = { indicator_id: "test", alpha: 4, beta: 1, evidence_log: [] };
  assert("Beta(4,1) mean = 0.8", approx(betaMean(high), 0.8));
  assert("Beta(4,1) n = 3", approx(effectiveSampleSize(high), 3));
  assert("Beta(4,1) confidence = 0.5", approx(confidence(high), 0.5));

  // Beta(1,4) — strong low evidence
  const low: BetaState = { indicator_id: "test", alpha: 1, beta: 4, evidence_log: [] };
  assert("Beta(1,4) mean = 0.2", approx(betaMean(low), 0.2));

  // Confidence curve
  const n3: BetaState = { indicator_id: "test", alpha: 2.5, beta: 2.5, evidence_log: [] };
  assert("n=3 confidence ~ 0.5", approx(confidence(n3), 0.5));

  const n10: BetaState = { indicator_id: "test", alpha: 6, beta: 6, evidence_log: [] };
  assert("n=10 confidence ~ 0.77", approx(confidence(n10), 0.77, 0.01));
}

async function testRecordEvidence() {
  console.log("\n Evidence recording");

  const session = createSession();
  const id = "behavioral.description.iterates_and_refines";

  // Strong direct evidence of high capability (worked example from spec §8)
  const result = recordEvidence(session, {
    indicator_id: id,
    anchor: 1.0,
    strength: 2,
    source: "direct",
    quote: "I always iterate; first answer is a draft.",
    turn: 2,
    probe_id: "behavioral.description.iterates_and_refines_primary",
  });

  const state = session.indicators[id];
  // alpha: 1.0 + 1.00 × 2.0 = 3.0, beta: 1.0 + 0.00 × 2.0 = 1.0
  assert("Direct high: alpha = 3.0", approx(state.alpha, 3.0));
  assert("Direct high: beta = 1.0", approx(state.beta, 1.0));
  assert("Direct high: mean = 0.75", approx(betaMean(state), 0.75));
  assert("Direct high: confidence = 0.4", approx(confidence(state), 0.4));
  assert("Evidence log has 1 entry", state.evidence_log.length === 1);
  assert("Source is direct", state.evidence_log[0].source === "direct");

  // Propagation log should contain correlated updates
  assert("Propagation log is non-empty", result.propagation_log.length > 0);
  assert("State vector has 51 entries", Object.keys(result.state_vector).length === 51);
}

async function testSourceWeighting() {
  console.log("\n Source quality weighting");

  // Direct: full weight
  const s1 = createSession();
  recordEvidence(s1, {
    indicator_id: "technical.memory_retrieval.rag",
    anchor: 0.67, strength: 2, source: "direct",
    quote: "test", turn: 1,
  });
  const directState = s1.indicators["technical.memory_retrieval.rag"];
  // alpha: 1.0 + 0.67 × 2.0 = 2.34
  assert("Direct weight: alpha ~ 2.34", approx(directState.alpha, 2.34));

  // Incidental: 0.7× weight
  const s2 = createSession();
  recordEvidence(s2, {
    indicator_id: "technical.memory_retrieval.rag",
    anchor: 0.67, strength: 2, source: "incidental",
    quote: "test", turn: 1,
  });
  const incState = s2.indicators["technical.memory_retrieval.rag"];
  // alpha: 1.0 + 0.67 × (2 × 0.7) = 1.0 + 0.67 × 1.4 = 1.938
  assert("Incidental weight: alpha ~ 1.94", approx(incState.alpha, 1.938, 0.01));

  // Metadata: 0.4× weight
  const s3 = createSession();
  recordEvidence(s3, {
    indicator_id: "technical.memory_retrieval.rag",
    anchor: 0.67, strength: 1, source: "metadata",
    quote: "test", turn: 0,
  });
  const metaState = s3.indicators["technical.memory_retrieval.rag"];
  // alpha: 1.0 + 0.67 × (1 × 0.4) = 1.0 + 0.268 = 1.268
  assert("Metadata weight: alpha ~ 1.27", approx(metaState.alpha, 1.268, 0.01));
}

async function testCorrelationPropagation() {
  console.log("\n Correlation propagation");

  const session = createSession();

  // Record evidence for embeddings — should propagate to RAG (r=0.8)
  const result = recordEvidence(session, {
    indicator_id: "technical.memory_retrieval.embeddings",
    anchor: 1.0, strength: 3, source: "direct",
    quote: "Deep embedding expertise", turn: 3,
  });

  // Check RAG got a correlated update
  const ragState = session.indicators["technical.memory_retrieval.rag"];
  const ragCorrelatedEntries = ragState.evidence_log.filter(e => e.source === "correlated");
  assert("RAG received correlated update", ragCorrelatedEntries.length > 0);

  if (ragCorrelatedEntries.length > 0) {
    const entry = ragCorrelatedEntries[0];
    assert("Correlated entry from embeddings", entry.from_indicator === "technical.memory_retrieval.embeddings");
    assert("Correlation r = 0.8", approx(entry.correlation_r ?? 0, 0.8));
    // target_anchor = 0.5 + 0.8 × (1.0 - 0.5) = 0.9
    assert("Target anchor ~ 0.9", approx(entry.anchor, 0.9));
    // target_weight = 0.8 × 3 × 1.0 × 0.3 = 0.72
    assert("Target weight ~ 0.72", approx(entry.weight, 0.72));
  }

  // RAG mean should have shifted upward from 0.5
  assert("RAG mean shifted up", betaMean(ragState) > 0.5);
  // But confidence should be low (correlation only)
  assert("RAG confidence < 0.5 (correlation only)", confidence(ragState) < 0.5);

  // Propagation log should include RAG
  const ragPropEntry = result.propagation_log.find(
    (p) => p.target_id === "technical.memory_retrieval.rag"
  );
  assert("Propagation log includes RAG", ragPropEntry !== undefined);
}

async function testNegativeCorrelation() {
  console.log("\n Negative/co-movement correlations");

  const session = createSession();

  // tokenisation_and_context has co-movement correlation with kv_cache (+0.9)
  // When tokenisation scores LOW, kv_cache should shift LOW too
  recordEvidence(session, {
    indicator_id: "technical.model_fundamentals.tokenisation_and_context",
    anchor: 0.0, strength: 3, source: "direct",
    quote: "No idea what tokens are", turn: 2,
  });

  const kvState = session.indicators["technical.memory_retrieval.kv_cache"];
  // With positive r=0.9 and anchor=0.0:
  // target_anchor = 0.5 + 0.9 × (0.0 - 0.5) = 0.5 - 0.45 = 0.05
  // This pushes kv_cache toward low, which is correct co-movement
  assert("KV cache mean shifted down", betaMean(kvState) < 0.5);
}

async function testProbeSelection() {
  console.log("\n Probe selection (EIG)");

  const session = createSession();

  // With uniform priors, master signal should rank high
  const result = selectNextProbe(session, [], 25);
  assert("Returns 5 ranked probes", result.ranked_probes.length === 5);
  assert("stop_recommended = false", result.stop_recommended === false);

  // The master signal should be in top 3 (importance=2.0)
  const masterInTop3 = result.ranked_probes
    .slice(0, 3)
    .some((p) =>
      p.target_indicators["behavioral.description.iterates_and_refines"] !== undefined
    );
  assert("Master signal in top 3", masterInTop3);

  // After recording strong evidence for many indicators, EIG should decrease
  const session2 = createSession();
  for (const id of registry.indicators.slice(0, 30)) {
    recordEvidence(session2, {
      indicator_id: id,
      anchor: 0.67, strength: 3, source: "direct",
      quote: "strong evidence", turn: 5,
    });
  }
  const result2 = selectNextProbe(session2, [], 25);
  assert(
    "After evidence: top EIG lower than initial",
    result2.ranked_probes[0].eig_score < result.ranked_probes[0].eig_score
  );
}

async function testStoppingConditions() {
  console.log("\n Stopping conditions");

  // Time budget reached
  const session = createSession();
  const timeResult = selectNextProbe(session, [], 1.5);
  assert("Time budget: stop recommended", timeResult.stop_recommended === true);
  assert("Time budget: correct reason", timeResult.stop_reason === "time_budget_reached");

  // All confidences met (force all indicators to high confidence)
  const session2 = createSession();
  for (const id of registry.indicators) {
    // Add enough evidence to push confidence above 0.6
    for (let i = 0; i < 5; i++) {
      recordEvidence(session2, {
        indicator_id: id,
        anchor: 0.67, strength: 3, source: "direct",
        quote: "strong", turn: i + 1,
      });
    }
  }
  const confResult = selectNextProbe(session2, [], 20);
  assert("All confident: stop recommended", confResult.stop_recommended === true);
  assert("All confident: correct reason", confResult.stop_reason === "all_confidences_met");
}

async function testSummarySkeleton() {
  console.log("\n Summary skeleton");

  const session = createSession();

  // Add varied evidence
  recordEvidence(session, {
    indicator_id: "behavioral.description.iterates_and_refines",
    anchor: 1.0, strength: 3, source: "direct",
    quote: "Iterates on everything", turn: 2,
  });
  recordEvidence(session, {
    indicator_id: "technical.memory_retrieval.rag",
    anchor: 0.67, strength: 2, source: "incidental",
    quote: "Mentioned RAG in passing", turn: 3,
  });
  recordEvidence(session, {
    indicator_id: "operational.cli_tooling.terminal",
    anchor: 0.0, strength: 2, source: "direct",
    quote: "Never uses terminal", turn: 4,
  });

  const skeleton = generateSummarySkeleton(session);

  assert("Has 3 radar means", "behavioral" in skeleton.radar_means && "technical" in skeleton.radar_means && "operational" in skeleton.radar_means);
  assert("Radar means are numbers", typeof skeleton.radar_means.behavioral === "number");
  assert("Has strengths array", Array.isArray(skeleton.strengths));
  assert("Has growth_areas array", Array.isArray(skeleton.growth_areas));
  assert("Strengths length <= 3", skeleton.strengths.length <= 3);
  assert("Growth areas length <= 2", skeleton.growth_areas.length <= 2);
  assert("Coverage total = 51", skeleton.coverage_breakdown.total_indicators === 51);
  assert("Has quality flags", Array.isArray(skeleton.quality_flags));

  // Coverage should reflect what we recorded
  assert("Some direct evidence", skeleton.coverage_breakdown.direct >= 2);
  assert("Some incidental evidence", skeleton.coverage_breakdown.incidental >= 1);
}

async function testMetadataPriors() {
  console.log("\n Metadata priors");

  // Role priors
  const aiPriors = rolePriors("AI Platform Engineer");
  assert("AI engineer gets role priors", aiPriors.length > 0);
  const hasTechnical = aiPriors.some((p) => p.indicator_id.startsWith("technical."));
  assert("AI engineer priors include technical indicators", hasTechnical);

  const kwPriors = rolePriors("Marketing Manager");
  // Knowledge workers may get no shifts or minimal shifts
  assert("Knowledge worker priors exist (may be empty)", Array.isArray(kwPriors));

  // Tool priors
  const ccPriors = toolPriors("Claude Code");
  assert("Claude Code gets tool priors", ccPriors.length > 0);
  const hasDevTools = ccPriors.some(
    (p) => p.indicator_id === "operational.cli_tooling.ai_native_dev_tools"
  );
  assert("Claude Code priors include ai_native_dev_tools", hasDevTools);

  // Frequency priors
  const dailyPriors = frequencyPriors("daily, multiple times");
  assert("Daily frequency gets priors", dailyPriors.length > 0);

  const weeklyPriors = frequencyPriors("weekly");
  assert("Weekly frequency returns array (may be empty)", Array.isArray(weeklyPriors));
}

async function testCorrelationMatrix() {
  console.log("\n Correlation matrix");

  assert("Matrix is non-empty", Object.keys(CORRELATION_MATRIX).length > 0);

  // Check specific known correlations
  const embToRag = CORRELATION_MATRIX["technical.memory_retrieval.embeddings"]?.["technical.memory_retrieval.rag"];
  assert("embeddings -> rag exists", embToRag !== undefined);
  assert("embeddings -> rag = 0.8", approx(embToRag ?? 0, 0.8));

  const ragToEmb = CORRELATION_MATRIX["technical.memory_retrieval.rag"]?.["technical.memory_retrieval.embeddings"];
  assert("rag -> embeddings exists", ragToEmb !== undefined);
  assert("rag -> embeddings = 0.8", approx(ragToEmb ?? 0, 0.8));

  // Check no self-correlations
  let selfCorr = false;
  for (const [source, targets] of Object.entries(CORRELATION_MATRIX)) {
    if (targets[source] !== undefined) selfCorr = true;
  }
  assert("No self-correlations", !selfCorr);

  // All indicator IDs in matrix should be valid
  let allValid = true;
  for (const [source, targets] of Object.entries(CORRELATION_MATRIX)) {
    if (!registry.indicators.includes(source)) { allValid = false; break; }
    for (const target of Object.keys(targets)) {
      if (!registry.indicators.includes(target)) { allValid = false; break; }
    }
  }
  assert("All matrix indicator IDs are valid", allValid);
}

async function testProbeLibrary() {
  console.log("\n Probe library");

  assert("Library has 51 probes", PROBE_LIBRARY.length === 51);

  // Each probe has required fields
  let allValid = true;
  for (const probe of PROBE_LIBRARY) {
    if (!probe.probe_id || !probe.indicator_id || !probe.text || !probe.backup_text) {
      allValid = false;
      break;
    }
    if (!probe.target_indicators[probe.indicator_id]) {
      allValid = false;
      break;
    }
  }
  assert("All probes have required fields", allValid);

  // Primary targets should have info_strength = 1.0
  const allPrimaryOne = PROBE_LIBRARY.every(
    (p) => p.target_indicators[p.indicator_id] === 1.0
  );
  assert("All primary targets have info_strength 1.0", allPrimaryOne);

  // Master signal importance
  assert(
    "Master signal importance = 2.0",
    INDICATOR_IMPORTANCE["behavioral.description.iterates_and_refines"] === 2.0
  );
}

async function testStoragePersistence() {
  console.log("\n Storage persistence");

  const testStorage = new SessionStorage(join(process.cwd(), "data", "test-sessions"));
  const testId = randomUUID();
  const blob = { session_id: testId, test: true };
  const uri = await testStorage.writeSessionBlob(testId, blob);
  assert("Returns file:// URI", uri.startsWith("file://"));
  assert("URI contains session ID", uri.includes(testId));
}

async function testWorkedExample() {
  console.log("\n Worked example (spec section 8)");

  const session = createSession();

  // Turn 2: first probe — iterates_and_refines
  // Respondent: "I usually iterate on the system prompt to get the chunking strategy right for our RAG"

  // Primary: iterates_and_refines, anchor=1.00, strength=2, direct
  recordEvidence(session, {
    indicator_id: "behavioral.description.iterates_and_refines",
    anchor: 1.0, strength: 2, source: "direct",
    quote: "I usually iterate on the system prompt...",
    turn: 2, probe_id: "behavioral.description.iterates_and_refines_primary",
  });

  // Incidental: system_vs_user_roles, anchor=0.67, strength=2
  recordEvidence(session, {
    indicator_id: "technical.prompting.system_vs_user_roles",
    anchor: 0.67, strength: 2, source: "incidental",
    quote: "iterate on the system prompt",
    turn: 2,
  });

  // Incidental: RAG, anchor=0.67, strength=2
  recordEvidence(session, {
    indicator_id: "technical.memory_retrieval.rag",
    anchor: 0.67, strength: 2, source: "incidental",
    quote: "chunking strategy right for our RAG",
    turn: 2,
  });

  // Check iterates_and_refines: α=3.0, β=1.0, μ=0.75
  const iterState = session.indicators["behavioral.description.iterates_and_refines"];
  assert("Worked example: iter α ~ 3.0", approx(iterState.alpha, 3.0, 0.1));
  assert("Worked example: iter β ~ 1.0", approx(iterState.beta, 1.0, 0.1));
  assert("Worked example: iter mean ~ 0.75", approx(betaMean(iterState), 0.75, 0.05));

  // Check RAG: incidental, α ~ 1.94, β ~ 1.46, μ ~ 0.571
  const ragState = session.indicators["technical.memory_retrieval.rag"];
  assert("Worked example: rag α ~ 1.94", approx(ragState.alpha, 1.94, 0.15));
  assert("Worked example: rag mean ~ 0.57", approx(betaMean(ragState), 0.57, 0.1));

  // Embeddings should have received correlated update from RAG (r=0.8)
  const embState = session.indicators["technical.memory_retrieval.embeddings"];
  const embCorrelated = embState.evidence_log.filter(e => e.source === "correlated");
  assert("Worked example: embeddings got correlated updates", embCorrelated.length > 0);
}

async function testRadarMeans() {
  console.log("\n Radar means");

  const session = createSession();

  // Record evidence for a few behavioral indicators
  recordEvidence(session, {
    indicator_id: "behavioral.delegation.sets_explicit_goals",
    anchor: 0.67, strength: 2, source: "direct",
    quote: "test", turn: 1,
  });
  recordEvidence(session, {
    indicator_id: "behavioral.description.iterates_and_refines",
    anchor: 1.0, strength: 3, source: "direct",
    quote: "test", turn: 2,
  });

  const behMean = computeRadarMean(session, "behavioral");
  assert("Behavioral radar mean is a number", typeof behMean === "number");
  assert("Behavioral mean > 0.5 (has high evidence)", behMean > 0.5);

  // Unprobed radar should be near 0.5
  const opMean = computeRadarMean(session, "operational");
  assert("Operational mean ~ 0.5 (unprobed)", approx(opMean, 0.5, 0.05));
}

// ── Run ─────────────────────────────────────────────

async function run() {
  console.log("NewCo Baseline Bayesian MCP Server — Test Suite\n");

  await testBetaMath();
  await testRecordEvidence();
  await testSourceWeighting();
  await testCorrelationPropagation();
  await testNegativeCorrelation();
  await testProbeSelection();
  await testStoppingConditions();
  await testSummarySkeleton();
  await testMetadataPriors();
  await testCorrelationMatrix();
  await testProbeLibrary();
  await testStoragePersistence();
  await testWorkedExample();
  await testRadarMeans();

  console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});

/* ─────────────────────────────────────────────────────
   Bayesian math for the AI Capability Baseline.
   All numerical reasoning lives here — Claude never
   computes posteriors; it classifies evidence and
   calls tools.
   ───────────────────────────────────────────────────── */

import type {
  BetaState,
  SessionState,
  Evidence,
  StateVector,
  IndicatorSummary,
  ProbeSelectionResult,
  SummarySkeleton,
  CoverageBreakdown,
  PropagationLogEntry,
  EvidenceLogEntry,
  RankedProbe,
} from "./types.js";
import { CORRELATION_MATRIX } from "./correlations.js";
import { PROBE_LIBRARY, INDICATOR_IMPORTANCE } from "./probes.js";

// ── Source quality multipliers ──────────────────────

const SOURCE_WEIGHT: Record<string, number> = {
  direct: 1.0,
  incidental: 0.7,
  metadata: 0.4,
};

/** Global dampening for correlation propagation (spec §4). */
const DAMPENING = 0.3;

// ── Derived quantities from Beta(α, β) ─────────────

export function betaMean(s: BetaState): number {
  return s.alpha / (s.alpha + s.beta);
}

export function effectiveSampleSize(s: BetaState): number {
  return s.alpha + s.beta - 2;
}

export function betaVariance(s: BetaState): number {
  const a = s.alpha;
  const b = s.beta;
  const sum = a + b;
  return (a * b) / (sum * sum * (sum + 1));
}

/**
 * Confidence bounded [0, 1].
 * Reaches 0.5 at n=3, 0.77 at n=10, 0.87 at n=20.
 */
export function confidence(s: BetaState): number {
  const n = effectiveSampleSize(s);
  return Math.max(0, n / (n + 3));
}

// ── Primary evidence source ─────────────────────────

export function primarySource(
  s: BetaState
): "direct" | "incidental" | "metadata" | "correlated" | "none" {
  for (const e of s.evidence_log) {
    if (e.source === "direct") return "direct";
  }
  for (const e of s.evidence_log) {
    if (e.source === "incidental") return "incidental";
  }
  for (const e of s.evidence_log) {
    if (e.source === "metadata") return "metadata";
  }
  for (const e of s.evidence_log) {
    if (e.source === "correlated") return "correlated";
  }
  return "none";
}

export function hasDirectEvidence(s: BetaState): boolean {
  return s.evidence_log.some(
    (e) => e.source === "direct" || e.source === "incidental"
  );
}

// ── State vector (compact read-only snapshot) ───────

export function indicatorSummary(s: BetaState): IndicatorSummary {
  return {
    indicator_id: s.indicator_id,
    mean: betaMean(s),
    confidence: confidence(s),
    variance: betaVariance(s),
    effective_sample_size: effectiveSampleSize(s),
    alpha: s.alpha,
    beta: s.beta,
    primary_source: primarySource(s),
  };
}

export function computeStateVector(session: SessionState): StateVector {
  const sv: StateVector = {};
  for (const [id, state] of Object.entries(session.indicators)) {
    sv[id] = indicatorSummary(state);
  }
  return sv;
}

// ── Evidence recording (spec §3) ────────────────────

export function recordEvidence(
  session: SessionState,
  evidence: Evidence
): { state_vector: StateVector; propagation_log: PropagationLogEntry[] } {
  const target = session.indicators[evidence.indicator_id];
  if (!target) {
    throw new Error(`Unknown indicator: ${evidence.indicator_id}`);
  }

  const sw = SOURCE_WEIGHT[evidence.source] ?? 1.0;
  const effectiveWeight = evidence.strength * sw;

  target.alpha += evidence.anchor * effectiveWeight;
  target.beta += (1 - evidence.anchor) * effectiveWeight;

  target.evidence_log.push({
    turn: evidence.turn,
    source: evidence.source,
    anchor: evidence.anchor,
    weight: effectiveWeight,
    quote: evidence.quote,
    probe_id: evidence.probe_id,
  });

  const propagation_log = propagateCorrelations(session, evidence);

  return {
    state_vector: computeStateVector(session),
    propagation_log,
  };
}

// ── Correlation propagation (spec §4) ───────────────

function propagateCorrelations(
  session: SessionState,
  evidence: Evidence
): PropagationLogEntry[] {
  const log: PropagationLogEntry[] = [];
  const sourceId = evidence.indicator_id;
  const correlations = CORRELATION_MATRIX[sourceId];
  if (!correlations) return log;

  const sw = SOURCE_WEIGHT[evidence.source] ?? 1.0;

  for (const [targetId, r] of Object.entries(correlations)) {
    if (r === 0 || targetId === sourceId) continue;
    const targetState = session.indicators[targetId];
    if (!targetState) continue;

    // Effective anchor: shift away from neutral by r × (anchor_A - 0.5)
    const targetAnchor = Math.max(0, Math.min(1, 0.5 + r * (evidence.anchor - 0.5)));
    const targetWeight = Math.abs(r) * evidence.strength * sw * DAMPENING;

    targetState.alpha += targetAnchor * targetWeight;
    targetState.beta += (1 - targetAnchor) * targetWeight;

    const entry: EvidenceLogEntry = {
      turn: evidence.turn,
      source: "correlated",
      anchor: targetAnchor,
      weight: targetWeight,
      from_indicator: sourceId,
      correlation_r: r,
    };
    targetState.evidence_log.push(entry);

    log.push({
      target_id: targetId,
      anchor: targetAnchor,
      weight: targetWeight,
      from_indicator: sourceId,
      correlation_r: r,
    });
  }

  return log;
}

// ── Radar means (confidence-weighted) ───────────────

export function computeRadarMean(
  session: SessionState,
  radar: string
): number {
  let weightedSum = 0;
  let weightSum = 0;
  const prefix = radar + ".";
  for (const [id, state] of Object.entries(session.indicators)) {
    if (id.startsWith(prefix)) {
      const m = betaMean(state);
      const c = confidence(state);
      weightedSum += m * c;
      weightSum += c;
    }
  }
  return weightSum > 0 ? weightedSum / weightSum : 0.5;
}

// ── Probe selection via EIG approximation (spec §5) ─

export function probeEigScore(
  session: SessionState,
  probe: (typeof PROBE_LIBRARY)[number]
): number {
  let score = 0;

  for (const [indicatorId, infoStrength] of Object.entries(
    probe.target_indicators
  )) {
    const target = session.indicators[indicatorId];
    if (!target) continue;

    const n = effectiveSampleSize(target);
    const expectedWeight = 2.0 * infoStrength;
    const varianceNow = betaVariance(target);
    // Projected variance after adding expected_weight pseudo-counts
    const varianceAfter =
      varianceNow * (n + 2) / (n + 2 + expectedWeight);
    const varianceReduction = varianceNow - varianceAfter;

    const importance = INDICATOR_IMPORTANCE[indicatorId] ?? 1.0;
    score += varianceReduction * importance * infoStrength;
  }

  const timeCost = probe.expected_minutes || 1.0;
  return score / timeCost;
}

export function selectNextProbe(
  session: SessionState,
  askedProbes: string[],
  timeRemainingMinutes: number
): ProbeSelectionResult {
  const askedSet = new Set(askedProbes);
  const candidates = PROBE_LIBRARY.filter((p) => !askedSet.has(p.probe_id));
  const scored = candidates
    .map((p) => ({ probe: p, score: probeEigScore(session, p) }))
    .sort((a, b) => b.score - a.score);

  const toRanked = (s: { probe: (typeof PROBE_LIBRARY)[number]; score: number }): RankedProbe => ({
    probe_id: s.probe.probe_id,
    eig_score: Math.round(s.score * 1e6) / 1e6,
    target_indicators: s.probe.target_indicators,
  });

  const top5 = scored.slice(0, 5).map(toRanked);

  // ── Stopping checks ──

  const allConfident = Object.values(session.indicators).every(
    (s) => confidence(s) >= 0.6
  );
  if (allConfident) {
    return {
      ranked_probes: top5,
      stop_recommended: true,
      stop_reason: "all_confidences_met",
    };
  }

  if (timeRemainingMinutes <= 2) {
    return {
      ranked_probes: top5,
      stop_recommended: true,
      stop_reason: "time_budget_reached",
    };
  }

  if (scored.length > 0 && scored[0].score < 0.0001) {
    return {
      ranked_probes: top5,
      stop_recommended: true,
      stop_reason: "marginal_info_gain_below_threshold",
    };
  }

  // ── High-capability override ──

  for (const radar of ["behavioral", "technical", "operational"] as const) {
    const radarMean = computeRadarMean(session, radar);
    if (radarMean > 0.85) {
      const prefix = radar + ".";
      const correlatedOnly = Object.values(session.indicators).filter(
        (s) =>
          s.indicator_id.startsWith(prefix) &&
          !hasDirectEvidence(s) &&
          confidence(s) < 0.6
      );
      if (correlatedOnly.length >= 3) {
        const correlatedIds = new Set(
          correlatedOnly.map((s) => s.indicator_id)
        );
        const forced = scored.find((s) =>
          Object.keys(s.probe.target_indicators).some((t) =>
            correlatedIds.has(t)
          )
        );
        if (forced) {
          const forcedRanked = toRanked(forced);
          const rest = top5.filter(
            (p) => p.probe_id !== forcedRanked.probe_id
          );
          return {
            ranked_probes: [forcedRanked, ...rest].slice(0, 5),
            stop_recommended: false,
            override_active: "high_capability_correlation_check",
          };
        }
      }
    }
  }

  return { ranked_probes: top5, stop_recommended: false };
}

// ── Summary skeleton (spec §7) ──────────────────────

export function generateSummarySkeleton(
  session: SessionState
): SummarySkeleton {
  const radarMeans = {
    behavioral: computeRadarMean(session, "behavioral"),
    technical: computeRadarMean(session, "technical"),
    operational: computeRadarMean(session, "operational"),
  };

  const indicators = Object.values(session.indicators).map(indicatorSummary);

  // Strengths: top 3 by confidence × mean (only those with some evidence)
  const withEvidence = indicators.filter((i) => i.confidence > 0.1);
  const byStrength = [...withEvidence].sort(
    (a, b) => b.mean * b.confidence - a.mean * a.confidence
  );
  const strengths = byStrength.slice(0, 3).map((i) => i.indicator_id);

  // Growth areas: bottom 2 by mean, among those with some confidence
  const withSignal = indicators.filter((i) => i.confidence > 0.2);
  const byWeakness = [...withSignal].sort((a, b) => a.mean - b.mean);
  const growth_areas = byWeakness.slice(0, 2).map((i) => i.indicator_id);

  const high_confidence_indicators = indicators.filter(
    (i) => i.confidence >= 0.6
  );
  const low_confidence_indicators = indicators.filter(
    (i) => i.confidence < 0.5
  );

  const coverage_breakdown = computeCoverageBreakdown(session);
  const quality_flags = computeQualityFlags(session, radarMeans);

  return {
    radar_means: radarMeans,
    strengths,
    growth_areas,
    high_confidence_indicators,
    low_confidence_indicators,
    coverage_breakdown,
    quality_flags,
  };
}

function computeCoverageBreakdown(session: SessionState): CoverageBreakdown {
  let direct = 0;
  let incidental = 0;
  let correlated = 0;
  let metadata = 0;
  let unscored = 0;

  for (const state of Object.values(session.indicators)) {
    switch (primarySource(state)) {
      case "direct":
        direct++;
        break;
      case "incidental":
        incidental++;
        break;
      case "correlated":
        correlated++;
        break;
      case "metadata":
        metadata++;
        break;
      default:
        unscored++;
    }
  }

  return { total_indicators: 51, direct, incidental, correlated, metadata, unscored };
}

function computeQualityFlags(
  session: SessionState,
  radarMeans: { behavioral: number; technical: number; operational: number }
): string[] {
  const flags: string[] = [];

  // Partial completion
  const unscoredCount = Object.values(session.indicators).filter(
    (s) => primarySource(s) === "none"
  ).length;
  if (unscoredCount > 0) flags.push("partial_completion");

  // Confidence floor per radar
  for (const radar of ["behavioral", "technical", "operational"] as const) {
    const prefix = radar + ".";
    const radarIndicators = Object.values(session.indicators).filter((s) =>
      s.indicator_id.startsWith(prefix)
    );
    if (radarIndicators.length === 0) continue;
    const meanConf =
      radarIndicators.reduce((sum, s) => sum + confidence(s), 0) /
      radarIndicators.length;
    if (meanConf < 0.4) flags.push(`confidence_floor_breached_${radar}`);
  }

  // Non-technical respondent with zeroed Operational
  const opIndicators = Object.values(session.indicators).filter((s) =>
    s.indicator_id.startsWith("operational.")
  );
  const zeroedOp = opIndicators.filter((s) => betaMean(s) < 0.1);
  if (zeroedOp.length > opIndicators.length * 0.7) {
    flags.push("non_technical_role_operational_zeroed");
  }

  return flags;
}

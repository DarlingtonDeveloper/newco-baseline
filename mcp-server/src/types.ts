/* ──────────────────────────────────────────────
   NewCo AI Capability Baseline — Bayesian types
   ────────────────────────────────────────────── */

export type EvidenceSource = "direct" | "incidental" | "metadata" | "correlated";
export type AnchorValue = 0 | 0.33 | 0.67 | 1;
export type StrengthValue = 1 | 2 | 3;

/** A single entry in an indicator's evidence log. */
export interface EvidenceLogEntry {
  turn: number;
  source: EvidenceSource;
  anchor: number;
  weight: number;
  quote?: string;
  probe_id?: string;
  /** Present only when source === "correlated" */
  from_indicator?: string;
  correlation_r?: number;
}

/** Input to record_evidence — what the skill sends per indicator per turn. */
export interface Evidence {
  indicator_id: string;
  anchor: number;          // 0 | 0.33 | 0.67 | 1
  strength: StrengthValue; // 1=weak, 2=medium, 3=strong
  source: Exclude<EvidenceSource, "correlated">;
  quote: string;           // verbatim, max 200 chars, redacted per PII rules
  turn: number;
  probe_id?: string;
}

/** Beta(α, β) posterior for one indicator. */
export interface BetaState {
  indicator_id: string;
  alpha: number;
  beta: number;
  evidence_log: EvidenceLogEntry[];
}

export interface UserMetadata {
  name: string;
  role: string;
  organisation?: string;
  tenure_months?: number;
}

/** Full in-memory session state. */
export interface SessionState {
  session_id: string;
  user_id: string;
  user_metadata: UserMetadata;
  indicators: Record<string, BetaState>;
  start_time: string;
  tools_used?: string[];
  frequency?: string;
  completion_state?: "complete" | "partial" | "stopped";
  consent_to_share_with_org?: boolean;
  end_time?: string;
  summary_text?: string;
}

/** Compact summary of one indicator — returned in state_vector responses. */
export interface IndicatorSummary {
  indicator_id: string;
  mean: number;
  confidence: number;
  variance: number;
  effective_sample_size: number;
  alpha: number;
  beta: number;
  primary_source: EvidenceSource | "none";
}

export type StateVector = Record<string, IndicatorSummary>;

/** A probe definition from the library. */
export interface ProbeDefinition {
  probe_id: string;
  indicator_id: string;          // primary target
  text: string;                   // primary question
  backup_text: string;
  target_indicators: Record<string, number>; // indicator_id → info_strength (1.0 primary, 0.5 also-informs)
  expected_minutes: number;
}

export interface RankedProbe {
  probe_id: string;
  eig_score: number;
  target_indicators: Record<string, number>;
}

export interface ProbeSelectionResult {
  ranked_probes: RankedProbe[];
  stop_recommended: boolean;
  stop_reason?: string;
  override_active?: string;
}

export interface CoverageBreakdown {
  total_indicators: number;
  direct: number;
  incidental: number;
  correlated: number;
  metadata: number;
  unscored: number;
}

export interface SummarySkeleton {
  radar_means: { behavioral: number; technical: number; operational: number };
  strengths: string[];
  growth_areas: string[];
  high_confidence_indicators: IndicatorSummary[];
  low_confidence_indicators: IndicatorSummary[];
  coverage_breakdown: CoverageBreakdown;
  quality_flags: string[];
}

export interface PropagationLogEntry {
  target_id: string;
  anchor: number;
  weight: number;
  from_indicator: string;
  correlation_r: number;
}

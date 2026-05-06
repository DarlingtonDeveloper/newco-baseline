export interface UserMetadata {
  name: string;
  role: string;
  tenure_months?: number;
  organisation?: string;
}

export interface SessionMetadata {
  tools_used: string[];
  frequency: string;
  [key: string]: unknown;
}

export type InferenceType = "direct" | "incidental" | "correlated" | "metadata";

export interface IndicatorScore {
  indicator_id: string;
  estimate: number;
  confidence: number;
  evidence: string;
  inference_type: InferenceType;
  updated_at: string;
}

export interface IndicatorUpdate {
  indicator_id: string;
  estimate: number;
  confidence: number;
  evidence: string;
  inference_type: InferenceType;
}

export interface Checkpoint {
  checkpoint_id: string;
  checkpoint_reason: "scheduled" | "manual" | "pre_finalize";
  turn_number?: number;
  timestamp: string;
  updates: IndicatorUpdate[];
}

export interface SessionSummary {
  radar_means: {
    behavioral: number;
    technical: number;
    operational: number;
  };
  strengths: string[];
  growth_areas: string[];
  practice_suggestion: string;
  coverage?: {
    total_indicators: number;
    directly_probed: number;
    incidental: number;
    correlated: number;
    metadata: number;
    unscored: number;
  };
  flags?: string[];
}

export interface Session {
  session_id: string;
  user_id: string;
  user_metadata: UserMetadata;
  session_metadata?: SessionMetadata;
  indicator_scores: Record<string, IndicatorScore>;
  checkpoints?: Checkpoint[];
  summary?: SessionSummary;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  completion_state?: "complete" | "partial" | "stopped";
  consent_to_share_with_org?: boolean;
}

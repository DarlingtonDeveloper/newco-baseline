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

export interface IndicatorScore {
  indicator_id: string;
  estimate: number;
  confidence: number;
  evidence: string;
  inference_type: "direct" | "correlated";
  updated_at: string;
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
}

export interface Session {
  session_id: string;
  user_id: string;
  user_metadata: UserMetadata;
  session_metadata?: SessionMetadata;
  indicator_scores: Record<string, IndicatorScore>;
  summary?: SessionSummary;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  completion_state?: "complete" | "partial" | "stopped";
  consent_to_share_with_org?: boolean;
}

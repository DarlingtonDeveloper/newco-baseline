import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { Session, Checkpoint, IndicatorScore } from "./types.js";

export class SessionStorage {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? join(process.cwd(), "data", "sessions");
  }

  private sessionPath(sessionId: string): string {
    return join(this.dataDir, `${sessionId}.json`);
  }

  async ensureDir(): Promise<void> {
    if (!existsSync(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true });
    }
  }

  async save(session: Session): Promise<void> {
    await this.ensureDir();
    await writeFile(
      this.sessionPath(session.session_id),
      JSON.stringify(session, null, 2),
      "utf-8"
    );
  }

  async load(sessionId: string): Promise<Session | null> {
    const path = this.sessionPath(sessionId);
    if (!existsSync(path)) return null;
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as Session;
  }

  /**
   * Append a checkpoint and merge its updates into indicator_scores.
   * Later writes for the same indicator_id supersede earlier ones.
   * Within a single checkpoint, duplicates are last-wins.
   */
  appendCheckpoint(session: Session, checkpoint: Checkpoint): void {
    if (!session.checkpoints) {
      session.checkpoints = [];
    }
    session.checkpoints.push(checkpoint);

    for (const update of checkpoint.updates) {
      session.indicator_scores[update.indicator_id] = {
        indicator_id: update.indicator_id,
        estimate: update.estimate,
        confidence: update.confidence,
        evidence: update.evidence,
        inference_type: update.inference_type,
        updated_at: checkpoint.timestamp,
      };
    }
  }

  /**
   * Rebuild indicator_scores from the checkpoint log.
   * Useful for audit or recovery: replays all checkpoints in order.
   */
  replayCheckpoints(session: Session): Record<string, IndicatorScore> {
    const scores: Record<string, IndicatorScore> = {};
    for (const cp of session.checkpoints ?? []) {
      for (const update of cp.updates) {
        scores[update.indicator_id] = {
          indicator_id: update.indicator_id,
          estimate: update.estimate,
          confidence: update.confidence,
          evidence: update.evidence,
          inference_type: update.inference_type,
          updated_at: cp.timestamp,
        };
      }
    }
    return scores;
  }
}

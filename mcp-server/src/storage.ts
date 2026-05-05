import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { Session } from "./types.js";

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
}

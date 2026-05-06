import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

export class SessionStorage {
  readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? join(process.cwd(), "data", "sessions");
  }

  private async ensureDir(): Promise<void> {
    if (!existsSync(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true });
    }
  }

  /**
   * Write the final session blob to disk as JSON.
   * Called once at finalization — no incremental writes during the session.
   */
  async writeSessionBlob(
    sessionId: string,
    blob: Record<string, unknown>
  ): Promise<string> {
    await this.ensureDir();
    const filePath = join(this.dataDir, `${sessionId}.json`);
    await writeFile(filePath, JSON.stringify(blob, null, 2), "utf-8");
    const absPath = resolve(filePath);
    return `file://${absPath.replace(/\\/g, "/")}`;
  }
}

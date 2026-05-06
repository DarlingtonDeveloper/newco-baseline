# NewCo AI Capability Baseline

A 20-30 minute conversational AI capability assessment measuring 51 indicators across three radars: Behavioral Fluency, Technical Understanding, and Operational Deployment.

Built as a Claude skill with an MCP server for session persistence.

## Project structure

```
skill/
  SKILL.md              # Assessment instrument — load as Claude skill or Project instructions

mcp-server/
  src/
    index.ts            # MCP server (6 tools, stdio transport)
    storage.ts          # JSON file persistence with append-only checkpoints
    types.ts            # TypeScript types
    indicators.json     # Versioned registry of all 51 indicator IDs
  test/
    e2e.ts              # End-to-end test suite
  data/
    sessions/           # Persisted session JSON files
```

## Setup

### 1. Build the MCP server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Connect to Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "newco-baseline": {
      "command": "node",
      "args": ["/path/to/newco-baseline/mcp-server/dist/index.js"],
      "env": {
        "BASELINE_DATA_DIR": "/path/to/newco-baseline/mcp-server/data/sessions"
      }
    }
  }
}
```

Restart Claude Desktop after editing the config.

### 3. Load the skill

Upload `skill/SKILL.md` via the Claude Desktop skill upload button, or paste its contents as Project instructions in a Claude Project.

### 4. Run an assessment

Start a new conversation. The skill handles the rest: opening, adaptive probing, scoring, summary generation, and session persistence.

## MCP tools

| Tool | Purpose |
|---|---|
| `list_indicators` | Return the canonical indicator registry (call at session start) |
| `start_baseline_session` | Begin a new assessment session |
| `log_metadata` | Record tools used, frequency, role |
| `log_indicator_updates` | Batch-persist indicator scores at checkpoints (every ~10 turns) |
| `log_indicator_update` | **Deprecated** — singular version, wraps to checkpoint internally |
| `log_classification_summary` | Record radar means, strengths, growth areas, coverage, flags |
| `finalize_session` | Close the session with duration, completion state, and full summary |

## Session persistence

Sessions are stored as JSON files in `mcp-server/data/sessions/`. Each file contains the full session state including all checkpoints (append-only), merged indicator scores, and the classification summary.

Indicator updates use a checkpoint cadence: one batch call every ~10 respondent turns instead of per-indicator-per-turn. This keeps conversation latency low while bounding worst-case data loss to ~10 turns on a dropped conversation.

## Running tests

```bash
cd mcp-server
npm run build
npx tsx test/e2e.ts
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `BASELINE_DATA_DIR` | `./data/sessions` | Directory for session JSON files |

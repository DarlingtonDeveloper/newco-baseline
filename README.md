# NewCo AI Capability Baseline

A 20-30 minute conversational AI capability assessment measuring 51 indicators across three radars: Behavioral Fluency, Technical Understanding, and Operational Deployment.

Built as a Claude skill with a Bayesian MCP server for deterministic scoring and session persistence.

## Architecture

Claude conducts the conversation and classifies evidence on a small ordinal scale (0 / 0.33 / 0.67 / 1.00). The MCP server handles all numerical reasoning:

- **Beta posteriors** — each indicator is a Beta(alpha, beta) distribution, updated via standard conjugate updates
- **Correlation propagation** — evidence on one indicator propagates to correlated indicators with dampening (0.3x)
- **EIG probe selection** — variance-reduction proxy ranks candidate probes by expected information gain
- **Summary generation** — confidence-weighted radar means, strengths, growth areas, coverage breakdown

The skill operates in two modes: **math mode** (MCP tools available, deterministic scoring) and **heuristic mode** (no MCP, approximate scoring in Claude's working memory with JSON state dump at close).

## Project structure

```
skill/
  SKILL.md              # Assessment instrument (v1.1) — load as Claude skill or Project instructions

mcp-server/
  src/
    index.ts            # MCP server (6 tools, stdio transport, in-memory session state)
    math.ts             # Beta math, evidence recording, correlation propagation, EIG, summary
    correlations.ts     # Sparse correlation matrix (87 pairs across 51 indicators)
    priors.ts           # Metadata prior lookup tables (role, tool, frequency)
    probes.ts           # Probe library (51 probes with target indicators and importance weights)
    storage.ts          # JSON file persistence (write-once at session finalization)
    types.ts            # TypeScript types
    indicators.json     # Versioned registry of all 51 indicator IDs
  test/
    e2e.ts              # Test suite (77 checks)
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

If MCP tools are unavailable, the skill falls back to heuristic mode — same conversation experience, approximate scoring, JSON state dump at close.

## MCP tools

| Tool | Purpose |
|---|---|
| `start_baseline_session` | Begin a new session; creates Beta(1,1) priors for all 51 indicators |
| `apply_metadata_priors` | Apply Bayesian priors from role, tools, frequency metadata |
| `record_evidence` | Record evidence for one indicator; server applies Beta update and propagates correlations |
| `select_next_probe` | Select next probe via EIG approximation; returns ranked probes and stopping recommendations |
| `generate_summary_skeleton` | Compute radar means, strengths, growth areas, coverage, quality flags |
| `finalize_session` | Write session blob to disk and release server memory |

## Bayesian math

Each indicator is a Beta(alpha, beta) distribution. Key formulas:

| Quantity | Formula |
|---|---|
| Mean (point estimate) | alpha / (alpha + beta) |
| Effective sample size | alpha + beta - 2 |
| Confidence | n / (n + 3) |
| Variance | alpha * beta / ((alpha + beta)^2 * (alpha + beta + 1)) |

Evidence updates scale by source quality: direct (1.0x), incidental (0.7x), metadata (0.4x). Correlation propagation uses a global dampening factor of 0.3x, keeping correlated indicators below ~0.5 confidence without direct evidence.

## Session persistence

Sessions are held in server memory during the conversation and written as a single JSON blob at finalization. No database required — output goes to the local filesystem (dogfooding), OneDrive (WA pilot), or S3 (future).

Each session blob contains the full Beta state for all 51 indicators, the complete evidence log with audit trail, and the computed summary skeleton.

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

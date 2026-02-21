# 🦞 OpenClaw — Multi-Agent Orchestration Platform

> A fork of [openclaw/openclaw](https://github.com/openclaw/openclaw) focused on agent and multi-agent orchestration — intelligent coordination of specialized agent teams for complex tasks.

---

## What is this fork?

OpenClaw is a personal AI assistant platform that runs on any device and responds through the channels you already use (WhatsApp, Telegram, Slack, Discord, etc.). This fork extends the upstream base with multi-agent orchestration as a first-class feature, introducing a specialized agent team, parallel execution with dependency control, and context sharing between sub-agents.

The execution model is built around the **Gateway** — a long-running daemon that serves as the control plane over WebSocket (`ws://127.0.0.1:18789`). The Gateway receives tasks from channels, creates jobs, spawns agent runs in separate processes, streams progress back to clients, and persists results in memory.

---

## Agent Team Architecture

This fork implements a specialized agent team with hierarchical delegation:

| Agent | Role | Responsibilities |
|-------------|-----------|----------------------------------------------------------|
| `@commander` | Coordinator | Entry point, context analysis, delegation, final decisions |
| `@planner` | Planner | Schedules, roadmaps, estimates, prioritization |
| `@engineer` | Engineer | Code, implementation, debugging, architecture |
| `@strategist` | Strategist | Analysis, research, evaluation of alternatives |
| `@creator` | Creator | Design, content, mockups, branding |

### Delegation Flow

The Commander is the entry point for every request. It autonomously decides whether to handle it directly or orchestrate other agents:

```
User → @commander → analyzes context
  ├─ simple task → handles directly
  └─ complex task → delegates
      ├─ @planner (planning)
      ├─ @engineer (implementation)
      ├─ @strategist (analysis)
      └─ @creator (creation)
```

Example: "Build a web app MVP" → Commander delegates sequentially to Planner → Engineer → Creator, passing context at each step.

---

## Orchestration Primitives

### 🔀 Parallel Execution with `parallel_spawn`

Runs multiple sub-agents concurrently with configurable wait strategies:

```typescript
parallel_spawn({
  tasks: [
    { task: "Research topic A", label: "researchA" },
    { task: "Research topic B", label: "researchB" },
    { task: "Research topic C", label: "researchC" }
  ],
  wait: "all"  // "all" | "any" | "race" | number
})
```

| Strategy | Behavior |
|----------|------------------------------------------|
| `"all"` | Waits for all agents to complete |
| `"any"` | Returns as soon as any agent finishes |
| `"race"` | Returns the first result, cancels the rest |
| `number` | Waits for N agents to complete |

### ⛓️ Task Chaining

Defines execution order with explicit dependencies — an agent only starts after its predecessor completes:

```typescript
parallel_spawn({
  tasks: [
    { task: "Fetch data", label: "fetch" },
    { task: "Process data", label: "process", chainAfter: "fetch" },
    { task: "Save results", label: "save", chainAfter: "process" }
  ]
})
```

### 📦 Context Sharing

Allows sub-agents to collaborate by passing state between each other:

```typescript
parallel_spawn({
  tasks: [
    { task: "Generate code", label: "gen", contextSharing: "summary" },
    { task: "Review code", label: "review", contextSharing: "full", sharedKey: "project" }
  ]
})
```

### 🛡️ Failure Control

Controls flow when dependencies fail without blocking the entire pipeline:

```typescript
parallel_spawn({
  tasks: [...],
  skipOnDependencyError: true  // Skips dependent tasks if a dependency fails
})
```

---

## Available Tools

| Tool | Description |
|------------------|---------------------------------------------------------|
| `parallel_spawn` | Runs multiple sub-agents in parallel with wait strategies |
| `sessions_spawn` | Spawns a single sub-agent with advanced options |
| `sessions_send` | Sends a message directly to another agent |
| `sessions_list` | Lists active sessions |
| `sessions_history` | Fetches session history |
| `subagents` | Manages sub-agents (list, cancel, steer) |

---

## Installation

```bash
# Clone the fork
git clone https://github.com/Heldinhow/openclaw.git
cd openclaw

# Install dependencies
pnpm install

# Build
pnpm build

# Start via wizard (recommended)
pnpm openclaw onboard
```

> Requirement: Node.js 22+. Bun is supported and preferred for TypeScript execution (scripts, dev, tests).

### Docker

```bash
# Full setup with Docker
./docker-setup.sh

# Or with docker-compose
docker-compose up
```

---

## API — Gateway WebSocket

The Gateway exposes a control plane at `ws://127.0.0.1:18789` with REST support for tool invocation:

```bash
curl -X POST "http://localhost:18789/tools/invoke" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tool": "parallel_spawn",
    "args": {
      "tasks": [
        { "task": "Task 1", "label": "t1" },
        { "task": "Task 2", "label": "t2" }
      ],
      "wait": "all"
    }
  }'
```

---

## Repository Structure

```
.
├── .agents/               # Agent team definitions and skills
├── .agent/workflows       # Declarative orchestration workflows
├── src/                  # Platform core (TypeScript)
├── packages/             # Internal monorepo packages
├── apps/                 # Companion apps (macOS, iOS, Android)
├── skills/               # Installed and managed skills
├── workspaces/           # Agent workspaces
├── AGENTS.md             # Agent documentation and conventions
├── SPEC.md               # Technical specification
└── VISION.md            # Fork vision and roadmap
```

---

## Differences from Upstream

| Feature | Upstream | This Fork |
|---------|----------|-----------|
| Multi-channel personal assistant | ✅ | ✅ |
| Basic sub-agents | ✅ | ✅ |
| Specialized agent team | ❌ | ✅ |
| Parallel execution with wait strategies | Partial | ✅ |
| Task chaining with chainAfter | ❌ | ✅ |
| Context sharing between agents | ❌ | ✅ |
| Hierarchical delegation via Commander | ❌ | ✅ |

---

## Ecosystem & Integrations

This fork is compatible with tools from the OpenClaw ecosystem:

- [Mission Control](https://github.com/crshdn/mission-control) — Kanban dashboard for visual agent and task management via Gateway
- [Antfarm](https://github.com/snarktank/antfarm) — Specialized agent team (planner, developer, verifier, tester, reviewer) in repeatable workflows
- [ClawX](https://github.com/ValueCell-ai/ClawX) — Desktop interface for visual orchestration, no terminal required

---

## Supported Channels

WhatsApp · Telegram · Slack · Discord · Google Chat · Signal · iMessage · Microsoft Teams · Matrix · Zalo · WebChat · macOS · iOS · Android

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Upstream

Based on [openclaw/openclaw](https://github.com/openclaw/openclaw). Upstream contributions are periodically merged into this fork.

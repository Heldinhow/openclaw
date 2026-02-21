# 🦞 OpenClaw — Multi-Agent Orchestration Platform

> A powerful platform for building, orchestrating, and managing autonomous AI agent workflows.

## Overview

OpenClaw is an AI assistant platform that excels at **multi-agent orchestration**. While it provides a complete assistant framework with multi-channel support (WhatsApp, Telegram, Slack, Discord, etc.), its core strength lies in spawning, coordinating, and managing multiple sub-agents that work together to accomplish complex tasks.

This fork emphasizes **sub-agent orchestration** as a first-class feature, enabling advanced patterns like parallel execution, task chaining, and distributed agent workflows.

---

## Multi-Agent Team

This fork implements a **specialized agent team** that works together to handle complex requests:

| Agent | Role | Capabilities |
|-------|------|--------------|
| `@commander` | Coordinator | General coordination, final decisions, delegates to other agents |
| `@planner` | Planner | Scheduling, timelines, roadmaps, estimates, prioritization |
| `@engineer` | Engineer | Code, implementation, debugging, architecture, technical tasks |
| `@strategist` | Strategist | Analysis, research, strategy, planning, evaluation |
| `@creator` | Creator | Design, visuals, content, mockups, branding |

### How It Works

The **Commander** is the entry point. It analyzes incoming requests and either:
- Handles it directly for general queries
- **Delegates** to the appropriate specialized agent via `@mention`

Example:
- "Make a website" → Commander delegates to Planner → Engineer → Creator
- "When is the meeting?" → Commander handles directly or delegates to Planner

---

## Core Features

### 🔀 Parallel Spawn

Execute multiple sub-agents concurrently with configurable wait strategies:

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

### ⛓️ Task Chaining

Define execution order with dependencies — task B waits for task A to complete:

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

Share state between sub-agents for collaborative workflows:

```typescript
parallel_spawn({
  tasks: [
    { task: "Generate code", label: "generate", contextSharing: "summary" },
    { task: "Review code", label: "review", contextSharing: "full", sharedKey: "project" }
  ]
})
```

### 🛡️ Error Handling

Control flow when dependencies fail:

```typescript
parallel_spawn({
  tasks: [...],
  skipOnDependencyError: true  // Skip dependent tasks if dependency fails
})
```

---

## Available Tools

| Tool | Description |
|------|-------------|
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
└── VISION.md             # Fork vision and roadmap
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

# 🦞 OpenClaw — Multi-Agent Orchestration Platform

> A powerful platform for building, orchestrating, and managing autonomous AI agent workflows.

## Overview

OpenClaw is an AI assistant platform that excels at **multi-agent orchestration**. While it provides a complete assistant framework with multi-channel support (WhatsApp, Telegram, Slack, Discord, etc.), its core strength lies in spawning, coordinating, and managing multiple sub-agents that work together to accomplish complex tasks.

This fork emphasizes **sub-agent orchestration** as a first-class feature, enabling advanced patterns like parallel execution, task chaining, and distributed agent workflows.

---

## Why Multi-Agent Orchestration?

Single agents are powerful, but complex tasks often benefit from:

- **Parallel execution** — Run independent tasks simultaneously
- **Specialization** — Different agents for different subtasks
- **Sequential workflows** — Chain dependencies where output feeds input
- **State sharing** — Agents collaborate through shared context

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

## Installation

```bash
# Clone the fork
git clone https://github.com/Heldinhow/openclaw.git
cd openclaw

# Install dependencies
pnpm install

# Build
pnpm build

# Run
pnpm start
```

---

## API Usage

### Gateway API

```bash
curl -X POST "http://localhost:18789/tools/invoke" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "tool": "parallel_spawn",
    "args": {
      "tasks": [
        {"task": "Task 1", "label": "t1"},
        {"task": "Task 2", "label": "t2"}
      ]
    }
  }'
```

---

## Available Tools

| Tool | Description |
|------|-------------|
| `parallel_spawn` | Execute multiple sub-agents in parallel with wait strategies |
| `sessions_spawn` | Spawn a single sub-agent with advanced options |
| `sessions_list` | List active sessions |
| `sessions_history` | Fetch session history |
| `subagents` | Manage sub-agents (list, cancel, steer) |

---

## Resources

- [Official Documentation](https://docs.openclaw.ai)
- [GitHub Repository](https://github.com/openclaw/openclaw)

---

## License

MIT

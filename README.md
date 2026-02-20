# 🦞 OpenClaw Fork — Enhanced Sub-Agent Orchestration

This fork adds **enhanced sub-agent orchestration features** to OpenClaw, making sub-agents more powerful and autonomous.

## What's Different from Official OpenClaw

This fork focuses on **multi-agent orchestration** capabilities not available in the main OpenClaw distribution.

---

## Features

### 1. Parallel Spawn (`parallel_spawn`)

Execute multiple sub-agents simultaneously with configurable wait strategies.

```typescript
{
  tool: "parallel_spawn",
  args: {
    tasks: [
      { task: "Research topic A", label: "researchA" },
      { task: "Research topic B", label: "researchB" },
      { task: "Research topic C", label: "researchC" }
    ],
    wait: "all"  // "all" | "any" | "race" | number
  }
}
```

### 2. Chain Dependencies (`chainAfter`)

Execute tasks sequentially — task B waits for task A to start before running.

```typescript
{
  tasks: [
    { task: "Fetch data", label: "fetch" },
    { task: "Process data", label: "process", chainAfter: "fetch" },
  ];
}
```

### 3. Context Sharing

Share state between sub-agents using sharedContext.

```typescript
{
  tasks: [
    { task: "First task", label: "t1", contextSharing: "summary" },
    { task: "Second task", label: "t2", contextSharing: "full", sharedKey: "project" },
  ];
}
```

### 4. Skip on Dependency Error

Optionally skip dependent tasks if the dependency fails.

```typescript
{
  tasks: [...],
  skipOnDependencyError: true
}
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

## Usage

### Via Gateway API

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

| Tool               | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| `parallel_spawn`   | Spawn multiple sub-agents in parallel with wait strategies |
| `sessions_spawn`   | Spawn single sub-agent with advanced options               |
| `sessions_list`    | List active sessions                                       |
| `sessions_history` | Get session history                                        |
| `subagents`        | Manage sub-agents (list, cancel, steer)                    |

---

## Documentation

- [Official OpenClaw Docs](https://docs.openclaw.ai)
- [Fork Changes](CHANGES.md)

---

## License

MIT — Same as OpenClaw

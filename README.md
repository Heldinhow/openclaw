# 🦞 OpenClaw Fork — Enhanced Sub-Agent Orchestration

This fork adds **enhanced sub-agent orchestration features** to OpenClaw, making sub-agents more powerful and autonomous.

## What's Different from Official OpenClaw

This fork focuses on **multi-agent orchestration** capabilities not available in the main OpenClaw distribution.

---

## Features

### 1. Multi-Agent Team with @mention Routing

A collaborative AI team with 5 specialized agents that can be invoked via @mention in Telegram:

| Agent      | Command       | Function                                    |
| ---------- | ------------- | ------------------------------------------- |
| Commander  | `@commander`  | Coordination, decisions, strategy (default) |
| Strategist | `@strategist` | Analysis, long-term planning                |
| Engineer   | `@engineer`   | Technical implementation, code              |
| Creator    | `@creator`    | Design, content creation                    |
| Planner    | `@planner`    | Scheduling, roadmaps, project management    |

**Usage in Telegram:**

```
@planner create a roadmap for Q1
@engineer help me write a function
@strategist analyze the market
```

### 2. Session Isolation

Each agent operates in isolated workspaces with:

- Individual memory (`MEMORY.md`, `GROUP_MEMORY.md`)
- Team context (`TEAM-DIRECTORY.md`, `TEAM-RULEBOOK.md`)
- Role definitions (`SOUL.md`, `AGENTS.md`, `ROLE-COLLAB-RULES.md`)

**Workspace structure:**

```
~/.openclaw/workspaces/{commander,strategist,engineer,creator,planner}/
├── SOUL.md              # Agent identity & personality
├── AGENTS.md            # Operational manual
├── ROLE-COLLAB-RULES.md # Collaboration rules
├── TEAM-DIRECTORY.md    # Team members
├── TEAM-RULEBOOK.md     # Operating rules
├── MEMORY.md            # Long-term memory
├── GROUP_MEMORY.md      # Shared team context
└── memory/              # Daily logs (YYYY-MM-DD.md)
```

### 3. Parallel Spawn (`parallel_spawn`)

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

### 4. Chain Dependencies (`chainAfter`)

Execute tasks sequentially — task B waits for task A to start before running.

```typescript
{
  tasks: [
    { task: "Fetch data", label: "fetch" },
    { task: "Process data", label: "process", chainAfter: "fetch" },
  ];
}
```

### 5. Context Sharing

Share state between sub-agents using sharedContext.

```typescript
{
  tasks: [
    { task: "First task", label: "t1", contextSharing: "summary" },
    { task: "Second task", label: "t2", contextSharing: "full", sharedKey: "project" },
  ];
}
```

### 6. Skip on Dependency Error

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

## Configuration

### Multi-Agent Setup

Edit `~/.openclaw/openclaw.json`:

```json
{
  "session": {
    "dmScope": "per-account-channel-peer"
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "groupPolicy": "allowlist"
    }
  },
  "agents": {
    "list": [
      {
        "id": "commander",
        "default": true,
        "identity": { "name": "Commander", "emoji": "🎯" },
        "groupChat": { "mentionPatterns": ["@commander"] }
      },
      {
        "id": "strategist",
        "identity": { "name": "Strategist", "emoji": "🧠" },
        "groupChat": { "mentionPatterns": ["@strategist"] }
      },
      {
        "id": "engineer",
        "identity": { "name": "Engineer", "emoji": "🔧" },
        "groupChat": { "mentionPatterns": ["@engineer"] }
      },
      {
        "id": "creator",
        "identity": { "name": "Creator", "emoji": "🎨" },
        "groupChat": { "mentionPatterns": ["@creator"] }
      },
      {
        "id": "planner",
        "identity": { "name": "Planner", "emoji": "📋" },
        "groupChat": { "mentionPatterns": ["@planner"] }
      }
    ]
  }
}
```

### Response Prefix

Configure how agents identify themselves:

```json
{
  "messages": {
    "responsePrefix": "{identity.name}:"
  }
}
```

Result: `Commander:`, `Planner:`, etc.

---

## Usage

### Via Telegram

Add your bot to a group and use @mention to invoke specific agents:

```
@planner create a 3-week roadmap
@engineer write a TypeScript function
@strategist analyze competitor products
@creator design a logo concept
@commander coordinate this project
```

Messages without @mention route to Commander (default agent).

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

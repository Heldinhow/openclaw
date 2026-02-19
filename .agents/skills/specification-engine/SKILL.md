---
name: specification-engine
description: Generates specifications using SpecKit before implementation tasks.
command-dispatch: tool
command-tool: speckit
---

# Specification Engine

## Overview

This skill handles project initialization and specification creation using SpecKit.

## Execution Flow

### Step 1: Check if directory exists

```typescript
// Check if target directory exists
```

### Step 2: New directory?

**IF NEW DIRECTORY:**

```typescript
// 1. Create directory
exec({ command: "mkdir -p /path/to/project" });

// 2. Initialize SpecKit
speckit({
  command: "init",
  directory: "/path/to/project",
  force: true,
});
```

**IF EXISTING DIRECTORY:**

```typescript
// Check if .specify or .opencode folder exists
// If NOT initialized:
speckit({
  command: "init",
  directory: "/path/to/project",
  force: true,
});
// If already initialized, SKIP this step
```

### Step 3: Speckit Commands (if project already initialized)

Use these slash commands with OpenCode:

```
speckit.specify   → Create SPEC.md
speckit.plan      → Create implementation plan
speckit.tasks     → Generate actionable tasks
speckit.implement → Execute implementation
```

### Step 4: Interactive OpenCode (optional)

To interact with OpenCode TUI directly:

```typescript
// Just use opencode command - this opens an interactive terminal
// No tool needed - type the command directly
opencode;
```

## Important Rules

1. **NEW project** → always run `speckit init`
2. **EXISTING project with SPEC.md** → skip to speckit commands
3. **Want to interact manually?** → use `opencode` command (not a tool)

## Tools Available

| Tool       | When to Use                          |
| ---------- | ------------------------------------ |
| `exec`     | Create directory with mkdir          |
| `speckit`  | Initialize SpecKit (speckit init)    |
| `opencode` | For TUI interaction, type "opencode" |

## Forbidden Tools

- write, edit (use opencode instead)

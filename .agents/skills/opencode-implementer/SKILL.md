---
name: opencode-implementer
description: Executes code implementation using OpenCode CLI based on specifications.
command-dispatch: tool
command-tool: opencode
---

# OpenCode Implementer

## Overview

This skill executes code implementation using OpenCode CLI after specifications are created.

## When to Use

After running specification-engine and having a SPEC.md, use this skill to implement features.

## Two Modes

### Mode 1: One-shot implementation

Use the opencode tool for single tasks:

```typescript
opencode({
  instruction: "Create a React counter component",
  directory: "/path/to/project",
});
```

### Mode 2: Interactive TUI

For complex implementations, interact with OpenCode directly:

```typescript
// Just type "opencode" - no tool needed
// This opens an interactive terminal where you can:
// - Use slash commands: /speckit.specify, /speckit.plan, etc.
// - Run multiple operations
// - Iterate on the implementation
```

## Execution Flow

1. **Read SPEC.md** to understand requirements
2. **Plan implementation** based on spec
3. **Execute using opencode tool or TUI**
4. **Verify** implementation matches SPEC.md

## Example Workflow

```
1. opencode tool: Create new feature
2. Or type: opencode (for interactive mode)
3. Inside TUI: /speckit.specify → make changes → /speckit.implement
```

## Parameters (for tool mode)

| Parameter   | Type   | Description              |
| ----------- | ------ | ------------------------ |
| instruction | string | What to implement        |
| directory   | string | Target project directory |
| model       | string | Optional model override  |

## Guardrails

- FORBIDDEN tools: write, edit
- ONLY use: opencode CLI
- Must have SPEC.md before implementing

## Composability

- Required with: specification-engine
- Runs after specification is complete

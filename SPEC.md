# SPEC.md - Parallel Spawn Feature

## Problem Statement

Currently, spawning multiple sub-agents requires making multiple sequential `sessions_spawn` calls. This is inefficient when sub-agents can run independently. The Parallel Spawn feature allows spawning multiple sub-agents simultaneously in a single call.

## Desired Behavior

### Core Requirements

1. **Parallel execution flag**
   - Add `parallel: true` to spawn multiple sub-agents simultaneously
   - Add `concurrent: number` as alternative (specifies max concurrent agents)

2. **Task array support**
   - When `parallel: true`, `task` can be either:
     - A single string (spawns multiple with same task)
     - An array of strings (each task spawns a separate sub-agent)

3. **Parallel result handling**
   - Each sub-agent runs independently
   - Results can be collected via `collectInto` (existing feature)
   - Summary of all parallel runs returned to parent

4. **Concurrency control**
   - `concurrent: 3` limits to 3 simultaneous agents
   - When limits exceeded, queue and start as slots free up

### Proposed API

```typescript
// Spawn 3 sub-agents in parallel (same task)
sessions_spawn({
  task: "research topic X",
  parallel: true,
  count: 3,
  collectInto: "$research",
});

// Spawn different tasks in parallel
sessions_spawn({
  task: ["task 1", "task 2", "task 3"],
  parallel: true,
  collectInto: "$results",
});

// Limited concurrency
sessions_spawn({
  task: ["task 1", "task 2", "task 3", "task 4", "task 5"],
  concurrent: 2, // max 2 at a time
});
```

## Implementation Plan

### 1. Update SpawnSubagentParams Type

Add new fields:

- `parallel?: boolean` - enable parallel execution
- `count?: number` - number of agents to spawn (default: task array length or 1)
- `concurrent?: number` - max concurrent agents (default: unlimited)

### 2. Update sessions-spawn-tool.ts Schema

Add:

- `parallel: Type.Optional(Type.Boolean())`
- `count: Type.Optional(Type.Number({ minimum: 1 }))`
- `concurrent: Type.Optional(Type.Number({ minimum: 1 }))`

### 3. Update subagent-spawn.ts

- Modify `spawnSubagentDirect` to handle parallel spawning
- When parallel is true and task is array or count > 1:
  - Loop and spawn multiple sub-agents
  - Respect concurrent limit
  - Return array of results

### 4. Update aggregation integration

- Leverage existing `collectInto` feature
- Each parallel sub-agent contributes to same collection

## Files to Modify

| File                                      | Change                                |
| ----------------------------------------- | ------------------------------------- |
| `src/agents/subagent-spawn.ts`            | Add parallel params to type and logic |
| `src/agents/tools/sessions-spawn-tool.ts` | Add params to schema                  |

## Acceptance Criteria

- [ ] Can spawn multiple sub-agents with `parallel: true`
- [ ] `count` parameter controls number of agents
- [ ] `concurrent` limits simultaneous agents
- [ ] Array of tasks spawns separate sub-agents
- [ ] Results can be collected via `collectInto`
- [ ] Backwards compatible (existing single spawn works)
- [ ] Proper error handling for invalid parameters

# SPEC.md - Pipeline/Chained Feature

## Problem Statement

Currently, sub-agents run independently after spawning. There's no built-in way to create dependencies between sub-agents where one waits for another to complete before starting. The Pipeline/Chained feature enables sequential execution where Sub-agent B waits for Sub-agent A to complete.

## Desired Behavior

### Core Requirements

1. **Chain dependency parameter**
   - Add `chainAfter: runId` to make sub-agent wait for a previous run to complete
   - Add `dependsOn: runId` as alias (same functionality)

2. **Dependency resolution**
   - Sub-agent B should not start until Sub-agent A completes
   - Should handle success and failure states appropriately
   - Should timeout if dependency takes too long

3. **Chaining multiple agents**
   - Can chain multiple sub-agents in sequence (A → B → C)
   - Each waits for previous to complete
   - Results from previous can be passed to next

4. **Error propagation**
   - If dependency fails, should handle gracefully
   - Option to continue or abort on failure

### Proposed API

```typescript
// Spawn first agent
sessions_spawn({
  task: "task A",
  label: "agent-a",
});

// Returns { runId: "run-abc-123", childSessionKey: "..." }

// Chain second agent after first completes
sessions_spawn({
  task: "task B",
  chainAfter: "run-abc-123", // wait for run-abc-123 to complete
});

// Or use dependsOn (alias)
sessions_spawn({
  task: "task C",
  dependsOn: "run-abc-123",
});

// Chain with result passing
sessions_spawn({
  task: "task C",
  chainAfter: "run-abc-123",
  includeDependencyResult: true, // pass result from previous run
});
```

## Implementation Plan

### 1. Update SpawnSubagentParams Type

Add new fields:

- `chainAfter?: string` - runId to wait for
- `dependsOn?: string` - alias for chainAfter
- `includeDependencyResult?: boolean` - include previous result in context

### 2. Update sessions-spawn-tool.ts Schema

Add:

- `chainAfter: Type.Optional(Type.String())`
- `dependsOn: Type.Optional(Type.String())`
- `includeDependencyResult: Type.Optional(Type.Boolean())`

### 3. Update subagent-spawn.ts

- Add function to check if a run has completed
- Add function to wait for a run to complete
- Modify `spawnSubagentDirect` to handle chainAfter

### 4. Create run dependency tracking

- Need to track run states (pending, running, completed, failed)
- Use session info to determine if run finished

## Files to Modify

| File                                      | Change                             |
| ----------------------------------------- | ---------------------------------- |
| `src/agents/subagent-spawn.ts`            | Add chain params to type and logic |
| `src/agents/tools/sessions-spawn-tool.ts` | Add params to schema               |

## Acceptance Criteria

- [ ] Can spawn sub-agent that waits for another via `chainAfter`
- [ ] `dependsOn` works as alias for `chainAfter`
- [ ] Sub-agent starts only after dependency completes
- [ ] Can chain multiple agents in sequence
- [ ] Proper error handling when dependency fails
- [ ] Backwards compatible (existing spawn works)
- [ ] Timeout handling for long-running dependencies

# Sub-agent Features Specification

## Status: All Features Implemented ✅

This document covers all sub-agent orchestration features implemented in the OpenClaw fork.

---

## Feature 1: Pipeline/Chained

**Status: ✅ IMPLEMENTED**

### Description

Sub-agent B waits for Sub-agent A to complete before starting.

### Parameters

- `chainAfter` - Run ID to wait for before starting
- `dependsOn` - Alias for `chainAfter`
- `includeDependencyResult` - Include dependency's output in current task

### Implementation

**Schema (sessions-spawn-tool.ts):**

```typescript
chainAfter: Type.Optional(Type.String()),
dependsOn: Type.Optional(Type.String()),
includeDependencyResult: Type.Optional(Type.Boolean()),
```

**Core Logic (subagent-spawn.ts):**

- Dependency check: verifies if dependency run exists
- Wait for completion: waits for dependency if not completed
- Result retrieval: gets dependency output if `includeDependencyResult=true`
- Task injection: prepends dependency result to current task

### Usage

```typescript
// Step 1: Start first task
sessions_spawn({
  task: "First task",
  label: "step-1",
});

// Step 2: Chain to step-1
sessions_spawn({
  task: "Second task that depends on first",
  chainAfter: "run-id-from-step-1",
  includeDependencyResult: true,
});

// Or use dependsOn as alias
sessions_spawn({
  task: "Task depending on another",
  dependsOn: "other-run-id",
});
```

### Acceptance Criteria

- [x] Can specify chainAfter or dependsOn parameter
- [x] Sub-agent waits for dependency to complete before starting
- [x] Can include dependency result in task via includeDependencyResult
- [x] Handles dependency errors appropriately
- [x] Works with parallel spawning
- [x] Backwards compatible

---

## Feature 2: Cancellation

**Status: ✅ IMPLEMENTED**

### Description

Allow cancellation of running sub-agents via a dedicated tool.

### Implementation

The cancellation feature is implemented via the `subagents` tool with action="cancel":

```
subagents(action="cancel", target="<runId|label|index|last|all>")
```

### Key Functions

- `requestSubagentCancellation(runId)` - marks cancellation request in registry
- `cascadeCancelChildren()` - recursively cancels child subagents

### Acceptance Criteria

- [x] `subagents` tool has `cancel` action available
- [x] Can cancel a running sub-agent by run ID, label, index, or "last"
- [x] Returns clear success/failure feedback
- [x] Handles non-existent run IDs gracefully
- [x] Works with the existing subagent tool suite
- [x] Supports canceling all subagents with target="all"
- [x] Cascades cancellation to child/descendant subagents

---

## Feature 3: Context Sharing

**Status: ✅ IMPLEMENTED**

### Description

Share state between sub-agents.

### Parameters

- `sharedContext` - Object with key-value pairs to share

### Implementation

**Schema:**

```typescript
sharedContext: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
```

**Registry Functions:**

- `storeSharedContext(runId, context)` - Store context
- `getSharedContext(runId)` - Retrieve context
- `getParentSharedContext(requesterSessionKey)` - Get parent's context

### Usage

```typescript
sessions_spawn({
  task: "Research AI frameworks",
  label: "researcher",
  sharedContext: {
    projectGoal: "Build a modern web app",
    targetAudience: "Developers",
  },
});
```

---

## Feature 4: Retry Policies

**Status: ✅ IMPLEMENTED**

### Parameters

- `retryCount` - Number of retries on failure
- `retryDelay` - Base delay between retries (ms)
- `retryBackoff` - Backoff strategy: "fixed", "exponential", "linear"
- `retryOn` - Error patterns to retry on
- `retryMaxTime` - Maximum total time for retries (ms)

### Usage

```typescript
sessions_spawn({
  task: "Task that might fail",
  retryCount: 3,
  retryDelay: 1000,
  retryBackoff: "exponential",
  retryOn: ["rate limit", "timeout"],
  retryMaxTime: 60000,
});
```

---

## Feature 5: Parallel Spawn

**Status: ✅ IMPLEMENTED**

### Parameters

- `parallel` - Enable parallel spawning
- `count` - Number of instances to spawn
- `concurrent` - Max concurrent spawns

### Usage

```typescript
sessions_spawn({
  task: ["Task A", "Task B", "Task C"],
  parallel: true,
});

// Or with count
sessions_spawn({
  task: "Same task",
  parallel: true,
  count: 5,
  concurrent: 2, // Max 2 at a time
});
```

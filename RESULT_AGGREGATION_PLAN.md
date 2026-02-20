# Implementation Plan: Better Result Aggregation for parallel_spawn

## 1. Problem Analysis

### Why Results Return Null

The `parallel_spawn` tool in `src/agents/tools/parallel-spawn-tool.ts` has a fundamental architectural issue:

1. **Fire-and-Forget Pattern**: When spawning subagents, the tool calls `callGateway({ method: "agent", ... })` which starts the agent asynchronously and returns immediately with only a `runId`:

   ```typescript
   const response = await callGateway<{ runId: string }>({
     method: "agent",
     params: { message: taskConfig.task, sessionKey: childSessionKey, ... },
     timeoutMs: 10_000,
   });
   // Returns: { runId: "..." }
   ```

2. **Missing Result Capture**: After spawning, the function returns a `TaskResult` with `status: "accepted"` but the `result` field is never populated:

   ```typescript
   return {
     index,
     label: taskConfig.label,
     task: taskConfig.task,
     status: "accepted", // ← Only "accepted", never "completed"
     childSessionKey,
     runId: childRunId,
     // result is undefined!
   };
   ```

3. **No Wait for Completion**: The tool never waits for the subagent to finish executing. The comment in the code explicitly acknowledges this:
   ```typescript
   // For now, we return the spawned results immediately
   // In a full implementation, we would wait for results based on wait strategy
   ```

### Where in Code the Result Should Be Captured

The fix needs to be applied in the `spawnSingleTask` function around lines 250-310. After getting the `runId`, we need to:

1. Wait for the agent job to complete (using `waitForAgentJob` from `agent-job.ts`)
2. Read the session messages to extract the actual output
3. Update the `TaskResult` with the captured result

---

## 2. Solution Design

### How to Capture Actual Output from Sub-agents

**Step 1: Wait for Agent Completion**
Use the existing `waitForAgentJob` function from `src/gateway/server-methods/agent-job.ts`:

```typescript
import { waitForAgentJob } from "../../gateway/server-methods/agent-job.js";

// After spawning, wait for completion
const jobResult = await waitForAgentJob({
  runId: childRunId,
  timeoutMs: timeoutMs, // configurable per-task
});
```

**Step 2: Extract Result from Session**
After the job completes, read the session transcript to get the assistant's response:

```typescript
import { readSessionMessages } from "../../gateway/session-utils.js";

const messages = readSessionMessages(childSessionKey, storePath);
const assistantMessages = messages.filter((m: any) => m.role === "assistant");
const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
const result = lastAssistantMessage?.content?.[0]?.text;
```

### Data Structure Changes

**TaskResult Interface** (already defined):

```typescript
interface TaskResult {
  index: number;
  label?: string;
  task: string;
  status: "accepted" | "completed" | "error" | "skipped";
  childSessionKey?: string;
  runId?: string;
  result?: unknown; // ← This needs to be populated
  error?: string;
  completedAt?: string;
  durationMs?: number;
}
```

**New fields to add**:

- `waitForCompletion` - boolean to enable/disable waiting
- `resultTimeoutMs` - timeout for waiting on each task

### API Changes

**Schema Update** (`ParallelTaskSchema`):

```typescript
const ParallelTaskSchema = Type.Object({
  // ... existing fields
  waitForCompletion: Type.Optional(
    Type.Boolean({ description: "Wait for subagent to complete before returning (default: true)" }),
  ),
  resultTimeoutMs: Type.Optional(
    Type.Number({ minimum: 0, description: "Timeout in ms to wait for result (default: 300000)" }),
  ),
});
```

**Tool-level timeout**:

```typescript
const ParallelSpawnToolSchema = Type.Object({
  // ... existing fields
  waitForCompletion: Type.Optional(
    Type.Boolean({ description: "Wait for all subagents to complete (default: true)" }),
  ),
  resultTimeoutMs: Type.Optional(
    Type.Number({
      minimum: 0,
      description: "Default timeout for each task in ms (default: 300000)",
    }),
  ),
});
```

---

## 3. Implementation Steps

### Files to Modify

1. **`src/agents/tools/parallel-spawn-tool.ts`** - Main implementation

### Code Changes Needed

#### Step 1: Import required functions

```typescript
import { waitForAgentJob } from "../../gateway/server-methods/agent-job.js";
import { readSessionMessages } from "../../gateway/session-utils.js";
```

#### Step 2: Add helper function to extract result from session

```typescript
async function extractResultFromSession(
  childSessionKey: string,
  storePath: string,
): Promise<{ result?: unknown; error?: string }> {
  try {
    const messages = readSessionMessages(childSessionKey, storePath);

    // Find the last assistant message with actual content
    const assistantMessages = messages.filter(
      (m: any) => m?.role === "assistant" && m?.content?.length > 0,
    );

    if (assistantMessages.length === 0) {
      return { error: "No assistant response found in session" };
    }

    const lastMessage = assistantMessages[assistantMessages.length - 1];
    return { result: lastMessage };
  } catch (err) {
    const errorText = err instanceof Error ? err.message : String(err);
    return { error: `Failed to extract result: ${errorText}` };
  }
}
```

#### Step 3: Modify spawnSingleTask to wait for completion

```typescript
const spawnSingleTask = async (
  taskConfig: (typeof tasks)[0],
  index: number,
): Promise<TaskResult> => {
  // ... existing spawn logic ...

  // Execute task
  const childIdem = crypto.randomUUID();
  let childRunId: string = childIdem;

  try {
    const response = await callGateway<{ runId: string }>({
      method: "agent",
      params: { message: taskConfig.task, sessionKey: childSessionKey, ... },
      timeoutMs: 10_000,
    });
    if (typeof response?.runId === "string" && response.runId) {
      childRunId = response.runId;
    }
  } catch (err) {
    // ... error handling ...
  }

  // NEW: Wait for completion if enabled
  const shouldWait = taskConfig.waitForCompletion !== false;
  const timeoutMs = taskConfig.resultTimeoutMs ?? 300_000; // 5 min default

  if (shouldWait) {
    const jobResult = await waitForAgentJob({
      runId: childRunId,
      timeoutMs,
    });

    if (!jobResult) {
      return {
        index,
        label: taskConfig.label,
        task: taskConfig.task,
        status: "error",
        childSessionKey,
        runId: childRunId,
        error: "Timeout waiting for subagent to complete",
        durationMs: Date.now() - taskStartTime,
      };
    }

    if (jobResult.status === "error") {
      return {
        index,
        label: taskConfig.label,
        task: taskConfig.task,
        status: "error",
        childSessionKey,
        runId: childRunId,
        error: jobResult.error ?? "Subagent execution failed",
        durationMs: Date.now() - taskStartTime,
      };
    }

    // Extract actual result from session
    const { result, error } = await extractResultFromSession(
      childSessionKey,
      /* storePath */
    );

    return {
      index,
      label: taskConfig.label,
      task: taskConfig.task,
      status: "completed",  // ← Now properly marked as completed
      childSessionKey,
      runId: childRunId,
      result,                // ← Actual result captured!
      error,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - taskStartTime,
    };
  }

  // Legacy behavior for when not waiting (backward compatible)
  return {
    index,
    label: taskConfig.label,
    task: taskConfig.task,
    status: "accepted",
    childSessionKey,
    runId: childRunId,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - taskStartTime,
  };
};
```

#### Step 4: Update the schema to reflect new options

Add `waitForCompletion` and `resultTimeoutMs` to both `ParallelTaskSchema` and `ParallelSpawnToolSchema`.

#### Step 5: Update aggregateResults if needed

The current `aggregateResults` function already handles the `result` field correctly. Ensure it extracts `result` properly when `includeMetadata` is false.

---

## 4. Testing Approach

### Unit Tests

1. Test `extractResultFromSession` with mock session messages
2. Test that `spawnSingleTask` properly waits and captures results
3. Test timeout behavior when agent takes too long

### Integration Tests

1. Spawn multiple tasks and verify all results are captured
2. Test with `wait: "all"` and verify all completed results
3. Test with `wait: "any"` / `wait: "race"` and verify first result
4. Test with `aggregate` modes

### Manual Testing

```bash
# Test basic spawning with result capture
curl -X POST http://localhost:3000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Use parallel_spawn to: task1: Say Hello, task2: Say World",
    "sessionKey": "agent:main:..."
  }'
```

---

## 5. Example Usage

### Before (Current Behavior - Results are null)

```typescript
const result = await parallel_spawn({
  tasks: [
    { task: "Say Hello", label: "task1" },
    { task: "Say World", label: "task2" },
  ],
  aggregate: { mode: "all" },
});

// result.results = [null, null]
// Each task has status: "accepted" but no actual output
```

### After (With Result Capture - Results are populated)

```typescript
const result = await parallel_spawn({
  tasks: [
    { task: "Say Hello", label: "task1" },
    { task: "Say World", label: "task2" },
  ],
  waitForCompletion: true, // NEW: wait for results
  resultTimeoutMs: 60000, // 1 minute per task
  aggregate: { mode: "all" },
});

// result.results = [
//   { role: "assistant", content: [{ type: "text", text: "Hello!" }], ... },
//   { role: "assistant", content: [{ type: "text", text: "World!" }], ... }
// ]
// Each task now has status: "completed" with actual output
```

### With Aggregation

```typescript
const result = await parallel_spawn({
  tasks: [
    { task: "Calculate 2+2", label: "math1" },
    { task: "Calculate 3*3", label: "math2" },
  ],
  waitForCompletion: true,
  aggregate: { mode: "summary", includeMetadata: true },
});

// result = {
//   total: 2,
//   successful: 2,
//   errors: 0,
//   results: [
//     { index: 0, status: "completed", result: { ... }, error: undefined },
//     { index: 1, status: "completed", result: { ... }, error: undefined }
//   ]
// }
```

---

## 6. Backward Compatibility

- Default `waitForCompletion: true` ensures new behavior by default
- For backward compatibility, if `waitForCompletion: false`, maintain the existing "accepted" behavior
- Add deprecation warning if using old behavior

---

## 7. Edge Cases to Handle

1. **Session file doesn't exist**: Return error with descriptive message
2. **Empty assistant response**: Return warning but still mark as completed
3. **Timeout during wait**: Return partial results with timeout error for that task
4. **Agent crash/error**: Capture error in the result
5. **Multiple assistant messages**: Always return the last one (final response)

---

## 8. Summary

The core fix requires:

1. Import `waitForAgentJob` and `readSessionMessages`
2. Add `waitForCompletion` and `resultTimeoutMs` options
3. In `spawnSingleTask`, wait for job completion after spawning
4. Extract result from session transcript after completion
5. Update `TaskResult.status` from "accepted" to "completed"

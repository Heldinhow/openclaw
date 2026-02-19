# SPEC.md - Retry Policies Feature

## Problem Statement

Currently, when a sub-agent fails, there's no built-in way to automatically retry the execution. The Retry Policies feature enables automatic retry with configurable backoff strategies when a sub-agent fails.

## Desired Behavior

### Core Requirements

1. **Retry count parameter**
   - Add `retryCount: number` to specify how many times to retry on failure
   - Default: 0 (no retries)

2. **Retry delay parameter**
   - Add `retryDelay: number` - fixed delay between retries in milliseconds
   - Default: 1000ms

3. **Backoff strategy parameter**
   - Add `retryBackoff: "fixed" | "exponential" | "linear"`
   - `"fixed"`: same delay between retries
   - `"exponential"`: delay doubles each retry (default)
   - `"linear"`: delay increases linearly

4. **Retry on specific errors**
   - Add `retryOn?: string[]` - list of error patterns to retry on
   - If not specified, retry on any error

5. **Max retry time**
   - Add `retryMaxTime?: number` - max total time for retries in ms
   - Useful to prevent infinite retries

### Proposed API

```typescript
// Basic retry - retry up to 3 times with exponential backoff
sessions_spawn({
  task: "task that might fail",
  retryCount: 3,
});

// Fixed delay retry - retry 2 times with 2 second delay
sessions_spawn({
  task: "task that might fail",
  retryCount: 2,
  retryDelay: 2000,
  retryBackoff: "fixed",
});

// Linear backoff retry
sessions_spawn({
  task: "task that might fail",
  retryCount: 3,
  retryDelay: 1000,
  retryBackoff: "linear",
});

// Retry with max time limit
sessions_spawn({
  task: "task that might fail",
  retryCount: 5,
  retryDelay: 1000,
  retryMaxTime: 30000, // max 30 seconds total
});

// Retry on specific errors only
sessions_spawn({
  task: "task that might fail",
  retryCount: 2,
  retryOn: ["rate limit", "timeout", "network error"],
});
```

## Implementation Plan

### 1. Update SpawnSubagentParams Type

Add new fields:

- `retryCount?: number` - max number of retries
- `retryDelay?: number` - delay between retries in ms (default: 1000)
- `retryBackoff?: "fixed" | "exponential" | "linear"` - backoff strategy (default: "exponential")
- `retryOn?: string[]` - error patterns to retry on
- `retryMaxTime?: number` - max total time for retries in ms

### 2. Update sessions-spawn-tool.ts Schema

Add:

- `retryCount: Type.Optional(Type.Number({ minimum: 0 }))`
- `retryDelay: Type.Optional(Type.Number({ minimum: 0 }))`
- `retryBackoff: Type.Optional(Type.Union([Type.Literal("fixed"), Type.Literal("exponential"), Type.Literal("linear")]))`
- `retryOn: Type.Optional(Type.Array(Type.String()))`
- `retryMaxTime: Type.Optional(Type.Number({ minimum: 0 }))`

### 3. Update subagent-spawn.ts

- Modify spawnSubagentDirect to handle retry logic
- Create helper function to calculate delay based on backoff strategy
- Add retry loop with proper error handling
- Check retryOn patterns to determine if error is retryable

### 4. Retry Logic

```typescript
async function executeWithRetry(params, ctx) {
  let lastError: Error | undefined;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      // Execute the subagent
      return await spawnSubagentDirectOnce(params, ctx);
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < retryCount) {
        // Check retryMaxTime
        if (retryMaxTime && Date.now() - startTime >= retryMaxTime) {
          break;
        }

        // Check if error matches retryOn patterns
        if (retryOn && retryOn.length > 0) {
          const errorStr = String(error).toLowerCase();
          const shouldRetry = retryOn.some((pattern) => errorStr.includes(pattern.toLowerCase()));
          if (!shouldRetry) {
            break;
          }
        }

        // Calculate delay based on backoff
        const delay = calculateDelay(attempt, retryDelay, retryBackoff);
        await sleep(delay);
      }
    }
  }

  // All retries failed
  return { status: "error", error: lastError?.message };
}

function calculateDelay(attempt: number, baseDelay: number, backoff: string): number {
  switch (backoff) {
    case "fixed":
      return baseDelay;
    case "linear":
      return baseDelay * (attempt + 1);
    case "exponential":
    default:
      return baseDelay * Math.pow(2, attempt);
  }
}
```

### 5. Update subagent-registry.ts

- Track retry attempts in the run registry
- Add `retryCount` and `retryAttempt` to run info

## Files to Modify

| File                                      | Change                                |
| ----------------------------------------- | ------------------------------------- |
| `src/agents/subagent-spawn.ts`            | Add retry params type and retry logic |
| `src/agents/tools/sessions-spawn-tool.ts` | Add retry params to schema            |
| `src/agents/subagent-registry.ts`         | Track retry attempts in run info      |

## Acceptance Criteria

- [ ] Can spawn sub-agent with `retryCount` parameter
- [ ] Sub-agent retries on failure up to retryCount times
- [ ] Retry delay works correctly (default exponential backoff)
- [ ] `retryBackoff: "fixed"` works correctly
- [ ] `retryBackoff: "linear"` works correctly
- [ ] `retryBackoff: "exponential"` works correctly
- [ ] `retryOn` filters which errors trigger retry
- [ ] `retryMaxTime` limits total retry time
- [ ] Backwards compatible (existing spawn works)
- [ ] Proper error reporting when all retries exhausted

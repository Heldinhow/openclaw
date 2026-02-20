# Feature: Pipeline/Chained Sub-agents

## Overview

Allow sub-agent B to wait for sub-agent A to complete before starting, enabling sequential task execution with dependencies.

## Parameters

- `chainAfter`: runId - Wait for this run to complete before starting
- `dependsOn`: runId - Alias for chainAfter

## Behavior

1. When a sub-agent is spawned with `chainAfter`, it waits in queue
2. Once the dependent run completes (success or failure), the chained run starts
3. The dependent run's result is passed to the chained run via sharedContext
4. If dependent run fails, chained run can optionally still execute or be cancelled

## Use Cases

- Task B needs output from Task A
- Sequential processing where each step depends on previous
- Error propagation between dependent tasks

## Edge Cases

- Dependent run doesn't exist: Error immediately
- Dependent run already completed: Start immediately
- Dependent run times out: Configurable (skip or cancel)
- Circular dependency: Detect and reject

---

# Feature: Retry Policies

## Overview

Automatic retry when sub-agent fails, with configurable backoff strategies.

## Parameters

- `retryCount`: number - Max retry attempts (default: 0)
- `retryDelay`: number - Initial delay in ms
- `retryBackoff`: "fixed" | "exponential" | "linear" - Backoff strategy
- `retryMaxTime`: number - Max total time for retries in ms
- `retryOn`: string[] - Error codes/patterns to retry on

## Behavior

1. On first failure, wait `retryDelay` ms
2. Apply backoff strategy for subsequent retries:
   - Fixed: same delay each time
   - Linear: delay += retryDelay each time
   - Exponential: delay \*= 2 each time
3. Retry up to `retryCount` times
4. If all retries fail, return final error
5. Only retry on errors matching `retryOn` (if specified)

## Use Cases

- Network failures (temporary timeouts)
- Rate limiting (temporary API limits)
- Transient service failures

## Example

```typescript
{
  retryCount: 3,
  retryDelay: 1000,
  retryBackoff: "exponential",
  retryOn: ["ETIMEDOUT", "ECONNRESET", "rate_limit"]
}
```

---

# Implementation Notes

Both features should integrate with existing:

- `subagent-registry.ts` - Track runs and dependencies
- `sessions_spawn` tool - Add new parameters
- Result aggregation - Pass dependent results to chained runs

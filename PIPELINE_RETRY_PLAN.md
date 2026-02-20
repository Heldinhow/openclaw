# Detailed Implementation Plan: Pipeline/Chained Sub-agents and Retry Policies

## Overview

This document provides a detailed implementation plan for two features:

1. **Pipeline/Chained Sub-agents** - Allow sub-agent B to wait for sub-agent A to complete before starting
2. **Retry Policies** - Automatic retry with configurable backoff strategies when sub-agents fail

> **Note:** After reviewing the codebase, both features have already been **partially implemented**. This document details the complete implementation including what's already done and any remaining work.

---

## Feature 1: Pipeline/Chained Sub-agents

### Parameters

| Parameter                 | Type    | Required | Default | Description                              |
| ------------------------- | ------- | -------- | ------- | ---------------------------------------- |
| `chainAfter`              | string  | No       | -       | Run ID to wait for before starting       |
| `dependsOn`               | string  | No       | -       | Alias for `chainAfter`                   |
| `includeDependencyResult` | boolean | No       | false   | Include dependency result in task prompt |

### Files Modified

1. **`src/agents/tools/sessions-spawn-tool.ts`** - Tool schema and parameter parsing
2. **`src/agents/subagent-spawn.ts`** - Dependency resolution and result passing
3. **`src/agents/subagent-registry.ts`** - Run status tracking and wait functionality

### Implementation Details

#### Step 1: Tool Schema (sessions-spawn-tool.ts)

The schema already includes the chain parameters:

```typescript
// File: src/agents/tools/sessions-spawn-tool.ts
const SessionsSpawnToolSchema = Type.Object({
  // ... other params
  // Chain/dependency parameters
  chainAfter: Type.Optional(Type.String()),
  dependsOn: Type.Optional(Type.String()),
  includeDependencyResult: Type.Optional(Type.Boolean()),
  // ... other params
});
```

#### Step 2: Parameter Parsing

```typescript
// File: src/agents/tools/sessions-spawn-tool.ts (in execute function)

// Chain/dependency parameters
const chainAfter = readStringParam(params, "chainAfter");
const dependsOn = readStringParam(params, "dependsOn");
const includeDependencyResult = params.includeDependencyResult === true;

// Use either chainAfter or dependsOn (dependsOn is an alias)
const dependencyRunId = chainAfter || dependsOn;
```

#### Step 3: Dependency Resolution in spawnSubagent

```typescript
// File: src/agents/subagent-spawn.ts (in spawnSubagentDirect function)

// Handle chainAfter/dependsOn - wait for dependency to complete
const dependencyRunId = params.chainAfter || params.dependsOn;
let dependencyResult: string | undefined;

if (dependencyRunId) {
  // Check if dependency run exists
  const dependencyStatus = getSubagentRunStatus(dependencyRunId);

  if (!dependencyStatus.exists) {
    return {
      status: "error",
      error: `Dependency run not found: ${dependencyRunId}`,
    };
  }

  // If dependency hasn't completed yet, wait for it
  if (!dependencyStatus.completed) {
    const waitResult = await waitForSubagentRunCompletion(dependencyRunId);

    if (!waitResult.completed) {
      return {
        status: "error",
        error: waitResult.error || `Dependency run ${dependencyRunId} did not complete`,
      };
    }

    // Check if dependency failed
    if (waitResult.outcome === "error" || waitResult.outcome === "timeout") {
      return {
        status: "error",
        error: `Dependency run ${dependencyRunId} ${waitResult.outcome}: ${waitResult.error || "unknown error"}`,
      };
    }
  } else if (dependencyStatus.outcome === "error" || dependencyStatus.outcome === "timeout") {
    return {
      status: "error",
      error: `Dependency run ${dependencyRunId} ${dependencyStatus.outcome}: ${dependencyStatus.error || "unknown error"}`,
    };
  }

  // Get the dependency result if requested
  if (params.includeDependencyResult && dependencyStatus.childSessionKey) {
    try {
      const historyResponse = await callGateway<{
        messages: Array<{ role: string; content: string }>;
      }>({
        method: "sessions.history",
        params: {
          sessionKey: dependencyStatus.childSessionKey,
          limit: 10,
        },
        timeoutMs: 10_000,
      });

      if (historyResponse?.messages && historyResponse.messages.length > 0) {
        const assistantMessages = historyResponse.messages
          .filter((m) => m.role === "assistant")
          .toReversed();
        if (assistantMessages.length > 0) {
          dependencyResult = assistantMessages[0].content;
        }
      }
    } catch {
      // Ignore errors getting history - continue without dependency result
    }
  }
}

// Prepend dependency result to task if requested
if (dependencyResult) {
  task = `[Previous step result]:\n${dependencyResult}\n\n[Current task]:\n${task}`;
}
```

#### Step 4: Registry Functions (subagent-registry.ts)

```typescript
// File: src/agents/subagent-registry.ts

export type SubagentRunStatus = {
  exists: boolean;
  completed: boolean;
  outcome?: "ok" | "error" | "timeout" | "unknown";
  error?: string;
  childSessionKey?: string;
  endedAt?: number;
};

const DEFAULT_CHAIN_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function waitForSubagentRunCompletion(
  runId: string,
  timeoutMs: number = DEFAULT_CHAIN_TIMEOUT_MS,
): Promise<SubagentRunStatus> {
  const key = runId.trim();
  if (!key) {
    return { exists: false, completed: false };
  }

  const startTime = Date.now();

  // Poll for completion (in production, this would use events)
  while (Date.now() - startTime < timeoutMs) {
    const status = getSubagentRunStatus(key);
    if (status.completed || !status.exists) {
      return status;
    }
    // Wait 500ms before checking again
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Timeout reached
  return {
    exists: true,
    completed: false,
    outcome: "timeout",
    error: `Timed out after ${timeoutMs}ms waiting for run ${key}`,
  };
}
```

### Edge Cases

1. **Dependency run doesn't exist**: Return error immediately
2. **Dependency run already completed**: Start immediately (no wait)
3. **Dependency run times out**: Configurable via timeout, returns error
4. **Dependency run fails**: Chained run can still execute or be cancelled based on `includeDependencyResult`
5. **Circular dependency**: Not explicitly detected - relies on timeout

### Usage Example

```typescript
// Spawn task A
const resultA = await tool.execute({
  task: "Research the topic",
  label: "research",
});

// Use resultA.runId as chainAfter for task B
const resultB = await tool.execute({
  task: "Write report based on research",
  chainAfter: resultA.runId,
  includeDependencyResult: true, // Includes result A in task B's prompt
});
```

---

## Feature 2: Retry Policies

### Parameters

| Parameter      | Type                                 | Required | Default       | Description                         |
| -------------- | ------------------------------------ | -------- | ------------- | ----------------------------------- |
| `retryCount`   | number                               | No       | 0             | Maximum retry attempts              |
| `retryDelay`   | number                               | No       | 1000          | Initial delay in milliseconds       |
| `retryBackoff` | "fixed" \| "exponential" \| "linear" | No       | "exponential" | Backoff strategy                    |
| `retryMaxTime` | number                               | No       | -             | Maximum total time for retries (ms) |
| `retryOn`      | string[]                             | No       | -             | Error patterns to retry on          |

### Files Modified

1. **`src/agents/tools/sessions-spawn-tool.ts`** - Tool schema and parameter parsing
2. **`src/agents/subagent-spawn.ts`** - Retry logic with backoff
3. **`src/agents/subagent-registry.ts`** - Retry configuration storage and execution retry

### Implementation Details

#### Step 1: Tool Schema (sessions-spawn-tool.ts)

```typescript
// File: src/agents/tools/sessions-spawn-tool.ts
const SessionsSpawnToolSchema = Type.Object({
  // ... other params
  // Retry parameters
  retryCount: Type.Optional(Type.Number({ minimum: 0 })),
  retryDelay: Type.Optional(Type.Number({ minimum: 0 })),
  retryBackoff: Type.Optional(
    Type.Union([Type.Literal("fixed"), Type.Literal("exponential"), Type.Literal("linear")]),
  ),
  retryOn: Type.Optional(Type.Array(Type.String())),
  retryMaxTime: Type.Optional(Type.Number({ minimum: 0 })),
  // ... other params
});
```

#### Step 2: Parameter Parsing

```typescript
// File: src/agents/tools/sessions-spawn-tool.ts (in execute function)

// Retry parameters
const retryCount =
  typeof params.retryCount === "number" && params.retryCount >= 0
    ? Math.floor(params.retryCount)
    : 0;
const retryDelay =
  typeof params.retryDelay === "number" && params.retryDelay >= 0
    ? Math.floor(params.retryDelay)
    : 1000;
const retryBackoff =
  params.retryBackoff === "fixed" || params.retryBackoff === "linear"
    ? params.retryBackoff
    : "exponential";
const retryOn = Array.isArray(params.retryOn)
  ? params.retryOn.filter((p): p is string => typeof p === "string")
  : undefined;
const retryMaxTime =
  typeof params.retryMaxTime === "number" && params.retryMaxTime >= 0
    ? Math.floor(params.retryMaxTime)
    : undefined;
```

#### Step 3: Backoff Calculation (subagent-spawn.ts)

```typescript
// File: src/agents/subagent-spawn.ts

export type RetryBackoffStrategy = "fixed" | "exponential" | "linear";

export function calculateDelay(
  attempt: number,
  baseDelay: number,
  strategy: RetryBackoffStrategy,
): number {
  switch (strategy) {
    case "exponential":
      return baseDelay * Math.pow(2, attempt);
    case "linear":
      return baseDelay * (attempt + 1);
    case "fixed":
    default:
      return baseDelay;
  }
}
```

#### Step 4: Retryable Error Check

```typescript
// File: src/agents/subagent-spawn.ts

export function isRetryableError(
  errorMessage: string,
  retryOnPatterns: string[] | undefined,
): boolean {
  if (!retryOnPatterns || retryOnPatterns.length === 0) {
    return true; // Retry all errors if retryOn is not specified
  }
  const lowerErrorMessage = errorMessage.toLowerCase();
  return retryOnPatterns.some((pattern) => lowerErrorMessage.includes(pattern.toLowerCase()));
}
```

#### Step 5: Retry Loop (subagent-spawn.ts)

```typescript
// File: src/agents/subagent-spawn.ts (in spawnSubagent function)

export async function spawnSubagent(
  params: SpawnSubagentParams,
  ctx: SpawnSubagentContext,
): Promise<SpawnSubagentResult> {
  const retryCount = params.retryCount ?? 0;
  const retryDelay = params.retryDelay ?? 1000;
  const retryBackoff = params.retryBackoff ?? "exponential";
  const retryOn = params.retryOn;
  const retryMaxTime = params.retryMaxTime;

  const startTime = Date.now();
  let lastResult: SpawnSubagentResult | undefined;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    lastResult = await spawnSubagentDirect(params, ctx);

    if (lastResult.status === "accepted") {
      return lastResult;
    }

    if (attempt < retryCount) {
      const errorMessage = lastResult?.error ?? "";

      // Check if this error should be retried
      if (!isRetryableError(errorMessage, retryOn)) {
        return lastResult;
      }

      // Check if we've exceeded max retry time
      if (retryMaxTime !== undefined) {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime >= retryMaxTime) {
          return lastResult;
        }
      }

      const delay = calculateDelay(attempt, retryDelay, retryBackoff);

      // Don't exceed remaining time
      const remainingTime =
        retryMaxTime !== undefined ? retryMaxTime - (Date.now() - startTime) : undefined;
      const actualDelay = remainingTime !== undefined ? Math.min(delay, remainingTime) : delay;

      if (actualDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, actualDelay));
      }
    }
  }

  return lastResult ?? { status: "error", error: "Unknown error during spawn" };
}
```

#### Step 6: Registry Retry Configuration

```typescript
// File: src/agents/subagent-registry.ts

export type RetryConfig = {
  retryCount: number;
  retryDelay: number;
  retryBackoff: "fixed" | "exponential" | "linear";
  retryOn?: string[];
  retryMaxTime?: number;
};

// Stored in SubagentRunRecord
export type SubagentRunRecord = {
  // ... other fields
  retryConfig?: RetryConfig;
  retryAttempt?: number;
  originalTask?: string;
  originalLabel?: string;
};
```

#### Step 7: Execution Retry Handler (subagent-registry.ts)

```typescript
// File: src/agents/subagent-registry.ts

async function spawnRetrySubagent(originalEntry: SubagentRunRecord): Promise<void> {
  const retryAttempt = (originalEntry.retryAttempt ?? 0) + 1;
  const { spawnSubagent } = await import("./subagent-spawn.js");

  const result = await spawnSubagent(
    {
      task: originalEntry.originalTask ?? originalEntry.task,
      label: originalEntry.originalLabel ?? originalEntry.label,
      agentId: undefined,
      model: originalEntry.model,
      runTimeoutSeconds: originalEntry.runTimeoutSeconds,
      cleanup: originalEntry.cleanup,
      expectsCompletionMessage: originalEntry.expectsCompletionMessage,
      aggregation: originalEntry.aggregation,
    },
    {
      agentSessionKey: originalEntry.requesterSessionKey,
    },
  );

  if (result.status === "accepted") {
    originalEntry.retryAttempt = retryAttempt;
    persistSubagentRuns();
  }
}

function handleExecutionRetry(entry: SubagentRunRecord): boolean {
  if (entry.outcome?.status !== "error") {
    return false;
  }

  if (!entry.retryConfig || entry.retryConfig.retryCount <= 0) {
    return false;
  }

  const currentAttempt = entry.retryAttempt ?? 0;
  if (currentAttempt >= entry.retryConfig.retryCount) {
    return false;
  }

  const errorMessage = entry.outcome?.error ?? "";
  if (!isRetryableError(errorMessage, entry.retryConfig.retryOn)) {
    return false;
  }

  if (entry.retryConfig.retryMaxTime) {
    const elapsed = Date.now() - (entry.startedAt ?? entry.createdAt);
    if (elapsed >= entry.retryConfig.retryMaxTime) {
      return false;
    }
  }

  const delay = calculateDelay(
    currentAttempt,
    entry.retryConfig.retryDelay,
    entry.retryConfig.retryBackoff,
  );

  setTimeout(() => {
    void spawnRetrySubagent(entry);
  }, delay).unref?.();

  return true;
}
```

### Backoff Strategies

| Strategy      | Delay Formula               | Example (baseDelay=1000) |
| ------------- | --------------------------- | ------------------------ |
| `fixed`       | `baseDelay`                 | 1s, 1s, 1s, 1s           |
| `linear`      | `baseDelay * (attempt + 1)` | 1s, 2s, 3s, 4s           |
| `exponential` | `baseDelay * 2^attempt`     | 1s, 2s, 4s, 8s           |

### Usage Example

```typescript
// Spawn with retry policy
const result = await tool.execute({
  task: "Call external API",
  retryCount: 3,
  retryDelay: 1000,
  retryBackoff: "exponential",
  retryMaxTime: 30000,
  retryOn: ["ETIMEDOUT", "ECONNRESET", "rate_limit", "429"],
});
```

---

## Testing Strategy

### Unit Tests

#### 1. Backoff Calculation Tests

```typescript
// File: src/agents/subagent-spawn.test.ts (create if not exists)

import { describe, it, expect } from "vitest";
import { calculateDelay, isRetryableError } from "./subagent-spawn.js";

describe("calculateDelay", () => {
  it("should return fixed delay", () => {
    expect(calculateDelay(0, 1000, "fixed")).toBe(1000);
    expect(calculateDelay(1, 1000, "fixed")).toBe(1000);
    expect(calculateDelay(2, 1000, "fixed")).toBe(1000);
  });

  it("should return linear delay", () => {
    expect(calculateDelay(0, 1000, "linear")).toBe(1000);
    expect(calculateDelay(1, 1000, "linear")).toBe(2000);
    expect(calculateDelay(2, 1000, "linear")).toBe(3000);
  });

  it("should return exponential delay", () => {
    expect(calculateDelay(0, 1000, "exponential")).toBe(1000);
    expect(calculateDelay(1, 1000, "exponential")).toBe(2000);
    expect(calculateDelay(2, 1000, "exponential")).toBe(4000);
    expect(calculateDelay(3, 1000, "exponential")).toBe(8000);
  });
});

describe("isRetryableError", () => {
  it("should retry all errors when retryOn is not specified", () => {
    expect(isRetryableError("some error", undefined)).toBe(true);
    expect(isRetryableError("some error", [])).toBe(true);
  });

  it("should only retry matching patterns", () => {
    expect(isRetryableError("Connection reset", ["ETIMEDOUT", "ECONNRESET"])).toBe(true);
    expect(isRetryableError("Rate limited", ["ETIMEDOUT"])).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(isRetryableError("TIMEOUT ERROR", ["timeout"])).toBe(true);
  });
});
```

#### 2. Registry Status Tests

```typescript
// File: src/agents/subagent-registry.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import {
  getSubagentRunStatus,
  waitForSubagentRunCompletion,
  registerSubagentRun,
  resetSubagentRegistryForTests,
} from "./subagent-registry.js";

describe("getSubagentRunStatus", () => {
  beforeEach(() => {
    resetSubagentRegistryForTests();
  });

  it("should return not found for non-existent run", () => {
    const status = getSubagentRunStatus("non-existent");
    expect(status.exists).toBe(false);
    expect(status.completed).toBe(false);
  });

  it("should return completed status for finished run", () => {
    registerSubagentRun({
      runId: "test-run-1",
      childSessionKey: "agent:test:subagent:1",
      requesterSessionKey: "agent:test:main",
      requesterDisplayKey: "main",
      task: "test task",
      cleanup: "keep",
      startedAt: Date.now() - 10000,
      endedAt: Date.now() - 5000,
      outcome: { status: "ok" },
    });

    const status = getSubagentRunStatus("test-run-1");
    expect(status.exists).toBe(true);
    expect(status.completed).toBe(true);
    expect(status.outcome).toBe("ok");
  });
});
```

### Integration Tests

#### 1. Chained Sub-agents Test

```typescript
// File: src/agents/openclaw-tools.subagents.sessions-spawn.chain.test.ts

import { describe, it, expect } from "vitest";

describe("sessions_spawn chainAfter", () => {
  it("should wait for dependency to complete before starting", async () => {
    // 1. Spawn first task
    const resultA = await sessionsSpawn.execute("task-a", {
      task: "Write 'hello' to /tmp/output.txt",
      label: "write-file",
    });

    expect(resultA.status).toBe("accepted");
    expect(resultA.runId).toBeDefined();

    // 2. Spawn second task that depends on first
    const resultB = await sessionsSpawn.execute("task-b", {
      task: "Read /tmp/output.txt and echo it",
      chainAfter: resultA.runId,
      includeDependencyResult: true,
    });

    expect(resultB.status).toBe("accepted");
    // Result B should have waited for A to complete
  });

  it("should fail immediately if dependency doesn't exist", async () => {
    const result = await sessionsSpawn.execute("task", {
      task: "Some task",
      chainAfter: "non-existent-run-id",
    });

    expect(result.status).toBe("error");
    expect(result.error).toContain("Dependency run not found");
  });
});
```

#### 2. Retry Policy Test

```typescript
// File: src/agents/openclaw-tools.subagents.sessions-spawn.retry.test.ts

describe("sessions_spawn retry", () => {
  it("should retry on failure up to retryCount times", async () => {
    let attemptCount = 0;
    // Mock spawn to fail first 2 times, then succeed
    vi.mocked(spawnSubagentDirect).mockImplementation(async () => {
      attemptCount++;
      if (attemptCount < 3) {
        return { status: "error", error: "Transient error" };
      }
      return { status: "accepted", runId: "success-run" };
    });

    const result = await spawnSubagent(
      {
        task: "Test task",
        retryCount: 3,
        retryDelay: 10, // Short delay for tests
        retryBackoff: "fixed",
      },
      {},
    );

    expect(result.status).toBe("accepted");
    expect(attemptCount).toBe(3); // Initial + 2 retries
  });

  it("should not retry if error is not retryable", async () => {
    let attemptCount = 0;
    vi.mocked(spawnSubagentDirect).mockImplementation(async () => {
      attemptCount++;
      return { status: "error", error: "Invalid input" };
    });

    const result = await spawnSubagent(
      {
        task: "Test task",
        retryCount: 3,
        retryDelay: 10,
        retryOn: ["transient", "timeout"], // Don't retry "Invalid input"
      },
      {},
    );

    expect(result.status).toBe("error");
    expect(attemptCount).toBe(1); // No retries
  });

  it("should respect retryMaxTime", async () => {
    let attemptCount = 0;
    vi.mocked(spawnSubagentDirect).mockImplementation(async () => {
      attemptCount++;
      return { status: "error", error: "Always fails" };
    });

    const startTime = Date.now();
    const result = await spawnSubagent(
      {
        task: "Test task",
        retryCount: 10,
        retryDelay: 100,
        retryMaxTime: 150, // Should only allow ~1-2 retries
      },
      {},
    );

    expect(result.status).toBe("error");
    // Should have stopped due to max time, not retry count
    expect(attemptCount).toBeLessThanOrEqual(3);
  });
});
```

### Test Data

| Test Case                                | Expected Behavior      |
| ---------------------------------------- | ---------------------- |
| `chainAfter` with existing completed run | Start immediately      |
| `chainAfter` with running run            | Wait for completion    |
| `chainAfter` with non-existent run       | Error immediately      |
| `retryCount: 0`                          | No retries             |
| `retryCount: 3` with all failures        | Return after 3 retries |
| `retryBackoff: "fixed"`                  | Same delay each retry  |
| `retryBackoff: "linear"`                 | Increasing delay       |
| `retryBackoff: "exponential"`            | Doubling delay         |
| `retryOn: ["timeout"]` with "auth error" | No retry               |
| `retryMaxTime` exceeded                  | Stop retrying          |

---

## Summary

Both features have been implemented with the following components:

### Pipeline/Chained Sub-agents

- ✅ Schema parameters: `chainAfter`, `dependsOn`, `includeDependencyResult`
- ✅ Dependency resolution in `spawnSubagentDirect`
- ✅ Registry functions: `getSubagentRunStatus`, `waitForSubagentRunCompletion`
- ✅ Result passing via task prompt modification

### Retry Policies

- ✅ Schema parameters: `retryCount`, `retryDelay`, `retryBackoff`, `retryOn`, `retryMaxTime`
- ✅ Backoff calculation: `calculateDelay` function
- ✅ Error filtering: `isRetryableError` function
- ✅ Retry loop in `spawnSubagent`
- ✅ Execution retry in registry: `handleExecutionRetry`, `spawnRetrySubagent`

### Remaining Work

- Unit tests for backoff and retry logic
- Integration tests for chained execution
- Circular dependency detection (not currently implemented)

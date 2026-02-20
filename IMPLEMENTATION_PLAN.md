# Implementation Plan: Pipeline/Chained + Retry Policies

## Feature 1: Pipeline/Chained Sub-agents

### Files to Modify:

1. `src/agents/tools/sessions-spawn-tool.ts` - Add `chainAfter` and `dependsOn` parameters
2. `src/agents/subagent-registry.ts` - Add dependency tracking
3. `src/agents/tools/sessions-spawn-tool.ts` - Add wait-for-dependency logic

### Implementation Steps:

#### Step 1: Add schema for chainAfter/dependsOn

```typescript
chainAfter: Type.Optional(Type.String({ description: "Run ID to wait for before starting" })),
dependsOn: Type.Optional(Type.String({ description: "Alias for chainAfter" })),
```

#### Step 2: Add dependency tracking in registry

- Create `waitForRun(runId: string): Promise<RunResult>`
- Track pending dependencies
- Emit event when dependency completes

#### Step 3: Implement wait logic in spawn tool

- Check if `chainAfter` is specified
- If yes, wait for that run to complete before starting
- Pass dependent result via sharedContext

---

## Feature 2: Retry Policies

### Files to Modify:

1. `src/agents/tools/sessions-spawn-tool.ts` - Add retry parameters
2. `src/agents/subagent-registry.ts` - Add retry logic
3. `src/agents/tools/sessions-spawn-tool.ts` - Implement backoff strategies

### Implementation Steps:

#### Step 1: Add schema for retry parameters

```typescript
retryCount: Type.Optional(Type.Number({ minimum: 0 })),
retryDelay: Type.Optional(Type.Number({ minimum: 0 })),
retryBackoff: Type.Optional(Type.Union([
  Type.Literal("fixed"),
  Type.Literal("exponential"),
  Type.Literal("linear")
])),
retryMaxTime: Type.Optional(Type.Number({ minimum: 0 })),
retryOn: Type.Optional(Type.Array(Type.String())),
```

#### Step 2: Implement retry logic in registry

- `retryWithBackoff(fn: () => Promise<T>, options: RetryOptions): Promise<T>`
- Support for: fixed, exponential, linear backoff
- Max total time tracking
- Error filtering with retryOn

#### Step 3: Integrate retry into spawn

- Wrap agent execution in retry logic
- Pass retry options from spawn parameters
- Track retry attempts and failures

---

## Testing Plan

- Unit tests for backoff strategies
- Integration tests for chained execution
- Test circular dependency detection
- Test retry on various error types

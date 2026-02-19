# SPEC.md - Context Sharing Feature

## Problem Statement

Currently, when spawning multiple sub-agents (either in parallel or chained via `chainAfter`/`dependsOn`), there is no built-in way to share state between them. Sub-agents run in isolation with no access to shared context or data produced by sibling/parent sub-agents. The Context Sharing feature enables passing and accessing shared state between sub-agents.

## Desired Behavior

### Core Requirements

1. **sharedContext parameter in sessions_spawn**
   - Add `sharedContext` as an optional object parameter
   - Can contain any serializable key-value pairs
   - Available to the spawned sub-agent as part of its context

2. **Context storage and retrieval**
   - Store shared context in the subagent registry
   - Sub-agents can access shared context via tool or system prompt injection
   - Context is accessible to all sub-agents in the same "family" (same parent session)

3. **API Usage**

```typescript
// Spawn with shared context
sessions_spawn({
  task: "Research the best AI frameworks",
  label: "researcher",
  sharedContext: {
    projectGoal: "Build a modern web app",
    targetAudience: "Developers",
    constraints: ["budget", "timeline"],
  },
});

// Later sub-agents can access previous context
sessions_spawn({
  task: "Design the UI based on research",
  label: "designer",
  sharedContext: {
    $research: "reference", // Special syntax to include previous result
  },
});

// Parallel with shared context
sessions_spawn({
  task: ["Task A", "Task B", "Task C"],
  parallel: true,
  sharedContext: {
    sharedData: "available to all",
  },
});
```

4. **Context propagation**
   - Child sub-agents inherit parent context by default
   - Can explicitly override or extend parent context
   - Context is read-only for child sub-agents (cannot modify parent's context)

## Implementation Plan

### 1. Update SessionsSpawnToolSchema

Add sharedContext parameter:

```typescript
sharedContext: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
```

### 2. Update SpawnSubagentParams

Add sharedContext to the params type:

```typescript
sharedContext?: Record<string, unknown>;
```

### 3. Update subagent-registry.ts

Add context storage and retrieval:

- `storeSharedContext(runId: string, context: Record<string, unknown>): void`
- `getSharedContext(runId: string): Record<string, | unknown> | undefined`
- `getParentSharedContext(requesterSessionKey: string): Record<string, unknown> | undefined`

### 4. Update subagent-spawn.ts

- Accept and process sharedContext parameter
- Merge with parent context if available
- Store context in registry
- Inject context into sub-agent's system prompt

### 5. Context injection in system prompt

The shared context should be injected into the sub-agent's system prompt so it's aware of the shared state:

```
[Shared Context]:
- projectGoal: "Build a modern web app"
- targetAudience: "Developers"
```

## Files to Modify

| File                                      | Change                                        |
| ----------------------------------------- | --------------------------------------------- |
| `src/agents/tools/sessions-spawn-tool.ts` | Add sharedContext to schema and pass to spawn |
| `src/agents/subagent-spawn.ts`            | Add sharedContext param and store in registry |
| `src/agents/subagent-registry.ts`         | Add context storage/retrieval functions       |
| `src/agents/subagent-announce.ts`         | Inject context into system prompt             |

## Acceptance Criteria

- [ ] Can pass sharedContext to sessions_spawn
- [ ] Sub-agent receives sharedContext in its execution
- [ ] Shared context is accessible via subagent-registry
- [ ] Context is injected into sub-agent's system prompt
- [ ] Works with parallel spawning (all sub-agents get same context)
- [ ] Works with chained sub-agents (subsequent sub-agents can access prior results)
- [ ] Parent context is inherited by child sub-agents
- [ ] Backwards compatible (existing code works without sharedContext)

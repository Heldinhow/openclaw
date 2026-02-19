# SPEC.md - Sub-agent Result Aggregation

## Problem Statement

Currently, when spawning multiple sub-agents, each result must be collected manually. There's no built-in way to aggregate results from multiple sub-agents into a single collection.

## Desired Behavior

### Core Requirements

1. **Named result collections**
   - Sub-agents can specify a collection name via `collectInto` param
   - Multiple sub-agents can contribute to the same collection
   - Parent can access all results from a collection

2. **Merge strategies**
   - `concat` - concatenate strings/arrays
   - `json` - merge as JSON object
   - `merge` - deep merge objects
   - `first` - use first result only
   - `last` - use last result only

3. **Collection management**
   - Collections are scoped to the parent session
   - Auto-cleanup after parent completes
   - Optional explicit cleanup

### Proposed API

```typescript
// Spawn with collection
sessions_spawn({
  task: "do something",
  collectInto: "$collection_name",
  mergeStrategy: "concat" | "json" | "merge" | "first" | "last",
});

// Parent accesses results
// After sub-agents complete, parent can access:
// subagentResults["$collection_name"]
```

## Implementation Plan

### 1. Update SpawnSubagentParams

Add new fields:

- `collectInto?: string` - collection name (starts with $)
- `mergeStrategy?: "concat" | "json" | "merge" | "first" | "last"`

### 2. Create Collection Store

- In-memory Map for collections per session
- Key: `sessionKey:collectionName`
- Value: aggregated results

### 3. Update subagent-announce.ts

- When sub-agent completes, check for `collectInto`
- If present, aggregate into collection instead of just announcing
- Use merge strategy to combine results

### 4. Expose collections to parent

- Add `subagentResults` to session context
- Parent can access collections after sub-agents complete

## Files to Modify

| File                                      | Change                      |
| ----------------------------------------- | --------------------------- |
| `src/agents/subagent-spawn.ts`            | Add new params to type      |
| `src/agents/tools/sessions-spawn-tool.ts` | Add params to schema        |
| `src/agents/subagent-announce.ts`         | Implement aggregation logic |
| `src/agents/subagent-registry.ts`         | Add collection store        |

## Acceptance Criteria

- [ ] Can spawn sub-agent with `collectInto` param
- [ ] Multiple sub-agents can contribute to same collection
- [ ] All merge strategies work correctly
- [ ] Parent can access aggregated results
- [ ] Collections are cleaned up after use
- [ ] Backwards compatible (existing behavior unchanged)

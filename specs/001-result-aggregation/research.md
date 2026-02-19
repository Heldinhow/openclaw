# Research: Result Aggregation Feature

**Date**: 2026-02-18  
**Feature**: Result Aggregation (001-result-aggregation)

## Research Questions

### 1. sessions_spawn Result Flow

**Question**: How do sub-agent results get returned to the parent session?

**Finding**: 
- `spawnSubagentDirect` in `src/agents/subagent-spawn.ts` returns immediately with `{ status, childSessionKey, runId }`
- The actual sub-agent result is announced back via message to the parent session
- The sub-agent runs asynchronously with the `agent` gateway method
- Results flow through the announcement system in `subagent-announce.ts`

### 2. Merge Strategy Implementations

**Question**: How to implement deep object merge and custom function evaluation safely?

**Finding**:
- For deep merge: Can use Lodash's `merge` function (already available in project) or implement recursive merge
- For custom functions: Need sandboxed evaluation - can use `Function` constructor with limited scope or a dedicated sandboxing approach

### 3. Aggregation Group Tracking

**Question**: Where to track aggregation groups and their results?

**Finding**:
- Existing `subagent-registry.ts` already tracks active sub-agent runs per session
- Can extend this to track aggregation groups: Map<sessionKey, Map<collectInto, AggregationGroup>>
- Aggregation groups are session-scoped (per parent agent session)

## Decisions Made

### Decision: Aggregation Implementation

**Chosen Approach**: 
- Add `collectInto` and `mergeStrategy` parameters to `sessions_spawn` tool schema
- Track aggregation groups in memory via extended subagent-registry
- When sub-agent completes, route result to aggregation group instead of (or in addition to) direct announcement
- Compute merged result when all sub-agents in group complete
- Expose via `subagentResults` context variable

**Rationale**: 
- Minimal changes to existing flow
- In-memory tracking is appropriate (<500ms overhead requirement)
- Backward compatible - existing sessions_spawn calls work unchanged

**Alternatives Considered**:
1. Store results in session store (rejected - adds persistence overhead)
2. Use separate tool for aggregation (rejected - less intuitive UX)

## Summary

All research questions resolved. Implementation approach determined:
- Extend sessions_spawn-tool.ts with new parameters
- Track aggregation in subagent-registry
- Implement 6 merge strategies (concat, json, merge, first, last, custom)
- Expose aggregated results via subagentResults context

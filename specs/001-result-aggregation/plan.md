# Implementation Plan: Result Aggregation

**Branch**: `[001-result-aggregation]` | **Date**: 2026-02-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-result-aggregation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Enable sub-agent result aggregation via the existing `sessions_spawn` tool by adding `collectInto` and `mergeStrategy` parameters. This allows parent agents to spawn multiple sub-agents that contribute to a shared aggregated result accessible via `subagentResults` instead of receiving individual responses separately.

## Technical Context

**Language/Version**: TypeScript (Node 22+)  
**Primary Dependencies**: OpenClaw Gateway tools, existing sessions_spawn implementation  
**Storage**: N/A - in-memory aggregation during session runtime  
**Testing**: Vitest (existing test framework for agent tools)  
**Target Platform**: OpenClaw Gateway (Linux/macOS server)  
**Project Type**: Single project - CLI/Gateway tool extension  
**Performance Goals**: <500ms aggregation overhead per SC-002  
**Constraints**: Backward compatible with existing sessions_spawn behavior  
**Scale/Scope**: Support up to 10 sub-agents per aggregation group (SC-001)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Note**: No constitution.md file found at `.specify/memory/constitution.md`. Proceeding without constitutional constraints.

## Project Structure

### Documentation (this feature)

```text
specs/001-result-aggregation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/agents/
├── tools/
│   ├── sessions-spawn-tool.ts      # MODIFY - add collectInto, mergeStrategy params
│   └── common.ts                   # MODIFY - add result aggregation utilities
├── subagent-spawn.ts               # MODIFY - handle aggregation tracking
├── subagent-registry.ts            # MODIFY - track aggregation groups
└── aggregation/                   # NEW - result aggregation logic
    ├── index.ts
    ├── merge-strategies.ts
    └── types.ts

tests/
├── unit/
│   └── aggregation/                # NEW - unit tests for merge strategies
└── e2e/
    └── sessions-spawn-aggregation.e2e.test.ts  # NEW - integration tests
```

**Structure Decision**: Feature extends existing `src/agents/tools/sessions-spawn-tool.ts` with new parameters. Creating a new `src/agents/aggregation/` directory for aggregation-specific logic to maintain separation of concerns.

## Phase 0: Research

### Research Tasks

Based on the feature specification, the following research areas were identified:

1. **sessions_spawn result flow**: How sub-agent results are currently returned to parent
2. **Merge strategy implementations**: Best practices for deep object merge and custom function evaluation

### Findings

#### Decision: Implementation Approach

**sessions_spawn Result Flow**:
- Currently, `spawnSubagentDirect` returns `{ status, childSessionKey, runId, ... }` immediately
- The actual sub-agent result is announced back via message to the parent session
- For aggregation, we need to intercept/capture these results before they're announced

**Aggregation Mechanism**:
- Add `collectInto` (string, e.g., "$research") and `mergeStrategy` (enum) parameters to sessions_spawn
- Track aggregation groups in memory (per session) via subagent-registry
- When sub-agent completes, add result to its aggregation group
- When all sub-agents in a group complete, compute merged result
- Make aggregated result available via `subagentResults` context variable

**Merge Strategies**:
- `concat`: Array concatenation
- `json`: Keyed object (index by sub-agent order)
- `merge`: Deep object merge (lodash.merge or similar)
- `first`/`last`: Return single result
- `custom`: Safe eval of user-provided function (sandboxed)

## Phase 1: Design

### Data Model

Key entities from spec:
- **AggregationGroup**: Collection tracking same `collectInto` + `mergeStrategy`
- **MergeStrategy**: Enum (concat, json, merge, first, last, custom)
- **SubAgentResult**: Individual sub-agent output
- **AggregatedResult**: Final combined result

### API Contracts

The feature extends existing sessions_spawn tool:

```
sessions_spawn({
  task: string,
  collectInto?: string,      // NEW: aggregation variable name (e.g., "$research")
  mergeStrategy?: string,    // NEW: concat|json|merge|first|last|custom
  // ... existing params
})
```

Result access:
```
subagentResults["$research"]  // Aggregated result
```

### Quickstart

```typescript
// Spawn multiple sub-agents with aggregation
sessions_spawn({
  task: "Pesquisar tema no Reddit",
  collectInto: "$pesquisa",
  mergeStrategy: "concat"
})

sessions_spawn({
  task: "Pesquisar tema no Twitter",
  collectInto: "$pesquisa", 
  mergeStrategy: "concat"
})

// Access aggregated result
const resultados = subagentResults["$pesquisa"]
// → ["Resultado Reddit", "Resultado Twitter"]
```

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| None identified | - | - |

---

**Plan Status**: Phase 1 Complete

**Next Steps**:
1. Run `/speckit.tasks` to generate implementation tasks
2. Implement aggregation types and merge strategies
3. Modify sessions-spawn-tool.ts to accept new parameters
4. Implement aggregation tracking in subagent-registry
5. Add unit and e2e tests

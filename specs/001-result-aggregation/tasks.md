# Tasks: Result Aggregation

**Feature**: Result Aggregation | **Branch**: `001-result-aggregation` | **Generated**: 2026-02-18

## Summary

- **Total Tasks**: 18
- **User Stories**: 4
- **Parallel Opportunities**: 4

## MVP Scope

The MVP (User Story 1) consists of tasks T001-T006:
- Create aggregation types
- Implement concat merge strategy
- Add collectInto/mergeStrategy params to sessions_spawn tool
- Add aggregation tracking to subagent-registry
- Add subagentResults to agent context

---

## Phase 1: Setup

- [X] T001 Create aggregation module directory structure in src/agents/aggregation/

---

## Phase 2: Foundational

- [X] T002 [P] Create aggregation types in src/agents/aggregation/types.ts
- [X] T003 [P] Implement merge strategies in src/agents/aggregation/merge-strategies.ts
- [X] T004 [P] Create aggregation service in src/agents/aggregation/index.ts

---

## Phase 3: User Story 1 - Parallel Research Aggregation (P1)

**Goal**: Enable sub-agents to contribute to a shared aggregated result using collectInto parameter with concat strategy.

**Independent Test**: Spawn 3 sub-agents with `collectInto: "$research"` and verify `subagentResults["$research"]` contains all results.

- [X] T005 [US1] Extend sessions-spawn-tool.ts schema with collectInto and mergeStrategy parameters
- [X] T006 [US1] Update spawnSubagentDirect to accept and handle aggregation params
- [X] T007 [US1] Add aggregation group tracking to subagent-registry.ts
- [X] T008 [US1] Wire up aggregation completion handler in subagent-announce.ts
- [X] T009 [US1] Expose subagentResults in agent context for parent session access

**Dependencies**: T002, T003, T004

---

## Phase 4: User Story 2 - Multiple Merge Strategies (P2)

**Goal**: Support json, merge, first, and last merge strategies.

**Independent Test**: Spawn sub-agents with different mergeStrategy values and verify correct output format.

- [ ] T010 [P] [US2] Add json merge strategy implementation
- [ ] T011 [P] [US2] Add merge (deep object) merge strategy implementation
- [ ] T012 [P] [US2] Add first/last merge strategy implementations

**Dependencies**: T003, T005-T009

---

## Phase 5: User Story 3 - Custom Merge Function (P3)

**Goal**: Allow users to define custom aggregation logic via customFunction parameter.

**Independent Test**: Provide custom function and verify aggregated result matches expected output.

- [ ] T013 [US3] Implement custom merge strategy with safe function evaluation
- [ ] T014 [US3] Add customFunction parameter validation to sessions_spawn tool

**Dependencies**: T003, T005-T009

---

## Phase 6: User Story 4 - Error Handling with Partial Results (P2)

**Goal**: Handle partial results when some sub-agents fail.

**Independent Test**: Spawn sub-agents where one fails, verify successful results are preserved.

- [ ] T015 [US4] Add error tracking to aggregation group
- [ ] T016 [US4] Implement partial result aggregation with error collection

**Dependencies**: T005-T009

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T017 Add validation for collectInto parameter (must start with $)
- [ ] T018 Add unit tests for merge strategies in tests/unit/aggregation/

---

## Dependency Graph

```
Phase 1 (Setup)
  └── T001

Phase 2 (Foundational)
  ├── T002 ← T001
  ├── T003 ← T001
  └── T004 ← T001

Phase 3 (US1 - Core)
  ├── T005 ← T002, T003
  ├── T006 ← T005
  ├── T007 ← T004
  ├── T008 ← T007
  └── T009 ← T008

Phase 4 (US2 - Merge Strategies)
  ├── T010 ← T003, T005
  ├── T011 ← T003, T005
  └── T012 ← T003, T005

Phase 5 (US3 - Custom)
  ├── T013 ← T003, T005
  └── T014 ← T013

Phase 6 (US4 - Error Handling)
  ├── T015 ← T009
  └── T016 ← T015

Phase 7 (Polish)
  ├── T017 ← T005
  └── T018 ← T002, T003
```

---

## Parallel Execution Examples

### Phase 2: Foundational
```bash
# These can run in parallel:
task T002: Create types
task T003: Implement merge strategies
task T004: Create aggregation service
```

### Phase 4: US2 Merge Strategies
```bash
# These can run in parallel:
task T010: Add json strategy
task T011: Add merge strategy
task T012: Add first/last strategies
```

---

## Implementation Strategy

### MVP First (US1 - Tasks T001-T009)
The core feature delivers immediate value:
1. Sub-agents can specify `collectInto` to join an aggregation group
2. Default `concat` strategy combines results into an array
3. Parent accesses results via `subagentResults["$variable"]`

### Incremental Delivery
- **Sprint 1**: US1 (MVP) - Basic aggregation with concat
- **Sprint 2**: US2 - Additional merge strategies (json, merge, first, last)
- **Sprint 3**: US3 - Custom merge function
- **Sprint 4**: US4 - Error handling + Polish

---

## File Paths Reference

| Task | File |
|------|------|
| T001 | src/agents/aggregation/ |
| T002 | src/agents/aggregation/types.ts |
| T003 | src/agents/aggregation/merge-strategies.ts |
| T004 | src/agents/aggregation/index.ts |
| T005 | src/agents/tools/sessions-spawn-tool.ts |
| T006 | src/agents/subagent-spawn.ts |
| T007 | src/agents/subagent-registry.ts |
| T008 | src/agents/subagent-announce.ts |
| T009 | src/agents/ (context injection) |
| T010-T012 | src/agents/aggregation/merge-strategies.ts |
| T013-T014 | src/agents/aggregation/merge-strategies.ts, sessions-spawn-tool.ts |
| T015-T016 | src/agents/aggregation/index.ts |
| T017 | src/agents/tools/sessions-spawn-tool.ts |
| T018 | tests/unit/aggregation/ |

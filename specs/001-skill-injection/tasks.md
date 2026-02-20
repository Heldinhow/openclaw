---
description: "Task list for Skill Injection System feature implementation"
---

# Tasks: Skill Injection System

**Input**: Design documents from `/specs/001-skill-injection/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests NOT requested in feature specification - skipping test tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Create definitions directory for skill definitions in src/agents/skills/definitions/
- [x] T002 Verify existing src/agents/skills/types.ts structure before extending

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Extend SkillDefinition interface in src/agents/skills/types.ts with new fields (allowed_tools, forbidden_tools, execution_protocol, composability_rules, compatibility_rules)
- [x] T004 [P] Add ComposedSkill type in src/agents/skills/types.ts
- [x] T005 [P] Add ValidationResult and ValidationError types in src/agents/skills/types.ts
- [x] T006 Add OutputContract, CompatibilityRule, ComposabilityRule types in src/agents/skills/types.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Define and Register Skills (Priority: P1) 🎯 MVP

**Goal**: Create SkillRegistry with register, get, list, and version override operations

**Independent Test**: Define a skill with allowed_tools and forbidden_tools, register it, retrieve by name, verify permissions match

### Implementation for User Story 1

- [x] T007 [P] [US1] Create SkillRegistry class in src/agents/skills/registry.ts with registerSkill() method
- [x] T008 [P] [US1] Implement getSkill() method in src/agents/skills/registry.ts
- [x] T009 [P] [US1] Implement listAvailableSkills() method in src/agents/skills/registry.ts
- [x] T010 [US1] Implement overrideSkillVersion() method in src/agents/skills/registry.ts
- [x] T011 [US1] Export SkillRegistry from src/agents/skills/index.ts (create if needed)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Compose Skills and Enforce Conflict Resolution (Priority: P2)

**Goal**: Implement composeSkills() with "most restrictive wins" strategy

**Independent Test**: Compose skill A (allows write) with skill B (forbids write), verify write is forbidden in result

### Implementation for User Story 2

- [x] T012 [P] [US2] Implement composeSkills() method in src/agents/skills/registry.ts
- [x] T013 [US2] Add "most restrictive wins" logic: intersection of allowed_tools minus union of forbidden_tools
- [x] T014 [US2] Handle union of execution_protocol from all composed skills

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Validate Skill Sets Before Sub-Agent Spawn (Priority: P3)

**Goal**: Implement validateSkillSet() to check for unknown skills, missing companions, incompatible combinations

**Independent Test**: Attempt to validate ["opencode-implementer"] without specification-engine, verify rejection

### Implementation for User Story 3

- [x] T015 [P] [US3] Create validation module in src/agents/skills/validation.ts (integrated in registry)
- [x] T016 [P] [US3] Implement validateSkillSet() with V001 (unknown skills) check
- [x] T017 [US3] Implement V002 (missing required companions) check
- [x] T018 [US3] Implement V003 (incompatible skills) check
- [x] T019 [US3] Integrate validation into SkillRegistry

**Checkpoint**: User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Context-Aware Skill Selection (Priority: P4)

**Goal**: Create SkillSelector that auto-selects coding skills when coding=true

**Independent Test**: Call selector with coding=true, verify both specification-engine and opencode-implementer returned

### Implementation for User Story 4

- [x] T020 [P] [US4] Create selector module in src/agents/skills/selector.ts
- [x] T021 [US4] Implement selectSkills() with coding=true → [specification-engine, opencode-implementer] rule
- [x] T022 [US4] Handle coding=false case (empty or minimal skills)
- [x] T023 [US4] Export SkillSelector from src/agents/skills/index.ts

**Checkpoint**: User Stories 1-4 should all work independently

---

## Phase 7: User Story 5 - Spawn Sub-Agent with Explicit Skills via sessions_spawn (Priority: P5)

**Goal**: Integrate skills parameter into sessions_spawn tool and subagent spawn flow

**Independent Test**: Call sessions_spawn with skills=[specification-engine, opencode-implementer], verify sub-agent has correct constraints

### Implementation for User Story 5

- [x] T024 [P] [US5] Add skills parameter to SessionsSpawnToolSchema in src/agents/tools/sessions-spawn-tool.ts
- [x] T025 [P] [US5] Modify SpawnSubagentParams type in src/agents/subagent-spawn.ts to include skills
- [ ] T026 [US5] Add skill validation call in spawnSubagentDirect() before spawning (stub - needs validation integration)
- [ ] T027 [US5] Pass composed skills to buildSubagentSystemPrompt() in src/agents/subagent-announce.ts (stub - needs integration)
- [ ] T028 [US5] Inject skill constraints into sub-agent system prompt (stub - needs integration)
- [x] T029 [US5] Handle spawn without skills (default behavior preserved)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 8: Coding Skills Definitions

**Goal**: Define the built-in coding skills

### Implementation

- [x] T030 [P] Define specification-engine skill in src/agents/skills/definitions/coding.ts
- [x] T031 [P] Define opencode-implementer skill in src/agents/skills/definitions/coding.ts
- [x] T032 Create exports in src/agents/skills/definitions/index.ts

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T033 [P] Run TypeScript type check on new files (pnpm tsgo)
- [ ] T034 [P] Run linter/format on new files (pnpm check)
- [ ] T035 Verify existing tests still pass (pnpm test)
- [ ] T036 Update quickstart.md if API surfaces changed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel after Phase 2
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5)
- **Polish (Phase 8-9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 complete (registry needed for composition)
- **User Story 3 (P3)**: Depends on US1 complete (registry needed for validation)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Uses registry
- **User Story 5 (P5)**: Depends on US1, US2, US3 complete (needs registry, validation, composition)

### Within Each User Story

- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Phase 1: T001, T002 can run in parallel
- Phase 2: T003, T004, T005, T006 can run in parallel
- Phase 3: T007, T008, T009 can run in parallel
- Phase 4: T012 can run after T009 (uses registry)
- Phase 5: T015, T016 can run in parallel
- Phase 6: T020, T021 can run in parallel
- Phase 7: T024, T025 can run in parallel
- Phase 8: T030, T031 can run in parallel
- Phase 9: T033, T034 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all core implementations for User Story 1 together:
Task: "Create SkillRegistry class in src/agents/skills/registry.ts"
Task: "Implement getSkill() method in src/agents/skills/registry.ts"
Task: "Implement listAvailableSkills() method in src/agents/skills/registry.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 4
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

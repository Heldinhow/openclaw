# Tasks: 5-Agent AI Collaborative OS

**Feature**: 002-multi-agent-os | **Generated**: 2026-02-21

## Summary

Transform OpenClaw into a 5-role collaborative operating system over Telegram. This is a **configuration-only** feature - no code implementation required.

**Total Tasks**: 8  
**Phases**: 3 (Setup, Foundational, User Stories)

---

## Phase 1: Setup

**Goal**: Create gateway configuration template with model support

- [x] T001 Create ~/.openclaw/openclaw.json configuration file per contracts/gateway-config.md schema with all 5 agents, model fields, and Telegram channel config

---

## Phase 2: Foundational

**Goal**: Create workspace directory structure for all 5 agents

- [x] T002 [P] Create workspace directories at ~/.openclaw/workspaces/{commander,strategist,engineer,creator,planner}/memory/archive
- [x] T003 [P] Create SOUL.md template files for each workspace role
- [x] T004 [P] Create AGENTS.md template files for each workspace
- [x] T005 [P] Create ROLE-COLLAB-RULES.md template files for each workspace
- [x] T006 [P] Create TEAM-RULEBOOK.md template files for each workspace
- [x] T007 [P] Create TEAM-DIRECTORY.md template files for each workspace

---

## Phase 3+: User Stories (Testing/Verification)

**Note**: These are manual verification tasks - the configuration is complete after Phase 2

### US1- Functionality (P4: Core1)

- [ ] T008 [US1] Test Commander default response in group chat (no @mention)
- [ ] T009 [US2] Test specific agent invocation via @mention
- [ ] T010 [US3] Test agent-to-agent delegation via @mention
- [ ] T011 [US4] Test DM session isolation

### US5-6: Workspace & Rules (P2)

- [ ] T012 [US5] Verify workspace memory persistence works
- [ ] T013 [US6] Verify all rule files are present and functional

---

## Dependencies

```
Phase 1 (T001)
    ↓
Phase 2 (T002-T007) - can run in parallel after T001
    ↓
Phase 3 (T008-T013) - all require Phase 2 complete
```

---

## Parallel Opportunities

- T003-T007 can run in parallel (different files, no dependencies)
- T008-T011 can run in parallel (different test scenarios, can be tested independently)

---

## Independent Test Criteria

| User Story | Test Criteria                                         |
| ---------- | ----------------------------------------------------- |
| US1        | Commander responds to plain message within 30 seconds |
| US2        | @engineer routes to Engineer only                     |
| US3        | Agent delegation via @mention works                   |
| US4        | DM context isolated from group                        |
| US5        | Memory files persist across restarts                  |
| US6        | All 5 rule files present per workspace                |

---

## Implementation Strategy

This is a configuration-only feature. Implementation order:

1. **MVP**: T001 (gateway config) - Enables basic routing
2. **MVP**: T002 (directories) - Enables workspace isolation
3. **Full**: T003-T007 - Complete rule file templates
4. **Verify**: T008-T013 - Manual testing in Telegram

**Suggested MVP Scope**: Tasks T001-T002 (core configuration only)

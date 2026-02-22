# Fix: Multi-Agent @mention Routing

## TL;DR

> **Quick Summary**: Fix the multi-agent @mention routing feature that doesn't work after merging branch 002-multi-agent-os. Requires: (1) adding multi-agent config to openclaw.json, (2) fixing the resolveAgentMention bug in resolve-route.ts, (3) adding TDD tests.

> **Deliverables**:
>
> - Multi-agent configuration in openclaw.json with 5 agents
> - Fixed resolveAgentMention function that checks text patterns
> - TDD tests for mention routing

> **Estimated Effort**: Medium
> **Parallel Execution**: NO - sequential (tasks depend on each other)
> **Critical Path**: Config → Fix Bug → Tests → Verify

---

## Context

### Original Request

A feature de multi-agents + feat: Add @mention-based agent routing não funciona após o merge com a main da branch 002-multi-agent-os. Após executar pnpm install && pnpm build, é como se não instalasse a versão do fork ou está quebrada. Cada agent deveria ter um soul.md, agents.md e ter comportamentos diferentes/persona/skills, mas isso não está acontecendo.

### Interview Summary

**Key Discussions**:

- Configuration missing in openclaw.json (no agents.list, mentionPatterns, agentDir)
- Bug in resolveAgentMention function - returns null without checking text patterns
- Workspaces exist at /workspaces/{commander,strategist,engineer,creator,planner}/ but not configured

**Research Findings**:

- Found spec at specs/002-multi-agent-os/spec.md with detailed requirements
- Found workspaces at /Users/helder/openclaw/workspaces/{commander,strategist,engineer,creator,planner}/ with all required files
- Current openclaw.json at ~/.openclaw/openclaw.json only has single-agent config

### Metis Review

**Identified Gaps** (addressed):

- Clarified scope: routing ONLY, not agent execution or spawning
- Added guardrail: DO NOT break single-agent mode
- Identified edge case: empty text with entities, malformed regex handling
- Added acceptance criteria: specific test commands needed

---

## Work Objectives

### Core Objective

Enable multi-agent @mention routing in Telegram group chats: (1) messages without @mention route to Commander, (2) @engineer routes to Engineer, etc., (3) each agent uses its own workspace.

### Concrete Deliverables

1. Updated openclaw.json with agents.list, mentionPatterns, and agentDir
2. Fixed resolveAgentMention function that checks text patterns
3. TDD tests for routing behavior
4. Verification that routing works end-to-end

### Definition of Done

- [ ] openclaw config shows 5 agents in agents.list
- [ ] resolveAgentMention("@commander hello") returns "commander"
- [ ] resolveAgentMention("hello") without @mention returns null (default handled elsewhere)
- [ ] pnpm test src/routing/resolve-route.test.ts passes
- [ ] Gateway starts without errors with multi-agent config

### Must Have

- Multi-agent config in openclaw.json
- Working @mention detection for Telegram
- TDD tests for routing behavior

### Must NOT Have (Guardrails)

- DO NOT break single-agent mode (existing configs must work)
- DO NOT modify unrelated routing code
- DO NOT add agent spawning/execution logic
- DO NOT change pattern matching from exact match to regex

---

## Verification Strategy

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: TDD
- **Framework**: vitest (existing in project)
- **Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR**

### QA Policy

Every task includes agent-executed QA scenarios (Playwright not needed - this is CLI/API).

---

## Execution Strategy

### Sequential Execution (Tasks depend on each other)

```
Task 1: Add multi-agent config to openclaw.json
  → Blocks: Task 2, 3
Task 2: Fix resolveAgentMention bug (check text patterns)
  → Blocks: Task 3
Task 3: Add TDD tests for mention routing
  → Blocks: Task 4
Task 4: Verify end-to-end routing works
```

---

## TODOs

- [ ] 1. Add multi-agent configuration to openclaw.json

  **What to do**:
  - Read current ~/.openclaw/openclaw.json
  - Add agents.list with 5 agents: commander (default), strategist, engineer, creator, planner
  - Add groupChat.mentionPatterns for each agent (e.g., @commander, @strategist, etc.)
  - Add agentDir pointing to /Users/helder/openclaw/workspaces/{agentId}
  - Preserve existing config (auth, channels, gateway, etc.)

  **Must NOT do**:
  - Remove existing single-agent configuration
  - Change any existing settings unrelated to multi-agent

  **Recommended Agent Profile**:

  > **Category**: `quick` - Simple JSON config edit
  - Reason: Straightforward config addition
    > **Skills**: []
  - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2, 3
  - **Blocked By**: None (can start immediately)

  **References**:
  - `~/.openclaw/openclaw.json` - Current config to modify
  - `specs/002-multi-agent-os/contracts/gateway-config.md` - Config schema reference
  - `src/config/zod-schema.core.ts` - Agent config schema (agents.list, groupChat, mentionPatterns, agentDir)
  - `/Users/helder/openclaw/workspaces/` - Workspace directories

  **WHY Each Reference Matters**:
  - Current config: Must preserve existing settings
  - Contract schema: Shows expected config format
  - Zod schema: TypeScript types for validation
  - Workspaces: Target directories for agentDir

  **Acceptance Criteria**:
  - [ ] openclaw config get agents.list shows 5 agents
  - [ ] Each agent has id, groupChat.mentionPatterns, and agentDir
  - [ ] commander has default: true
  - [ ] Config passes validation (openclaw doctor)

  **QA Scenarios**:

  Scenario: Verify config loads without errors
  Tool: Bash
  Preconditions: openclaw.json modified
  Steps: 1. Run `openclaw doctor` 2. Check output for config validation
  Expected Result: No errors, config valid
  Failure Indicators: Validation errors, missing fields
  Evidence: .sisyphus/evidence/task-1-config-valid.txt

  ***

- [ ] 2. Fix resolveAgentMention function to check text patterns

  **What to do**:
  - Read src/routing/resolve-route.ts (around lines 474-524)
  - Modify resolveAgentMention to also check mentionPatterns in text when entities.length === 0
  - Current bug: returns null if entities?.length === 0
  - Fix: Add fallback to check patterns in raw text

  **Must NOT do**:
  - Change pattern matching logic (exact match with @ prefix)
  - Break existing entity-based detection
  - Add regex support (out of scope)

  **Recommended Agent Profile**:

  > **Category**: `ultrabrain` - Logic-heavy bug fix
  - Reason: Requires careful logic to not break existing behavior
    > **Skills**: []
  - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3
  - **Blocked By**: Task 1 (needs config to test)

  **References**:
  - `src/routing/resolve-route.ts:474-524` - resolveAgentMention function
  - `src/routing/resolve-route.test.ts` - Existing tests for reference
  - `src/config/zod-schema.core.ts` - Config schema for mentionPatterns

  **WHY Each Reference Matters**:
  - resolveRoute.ts: The function that needs fixing
  - Test file: Shows testing patterns for this module
  - Zod schema: Confirms mentionPatterns is array of strings

  **Acceptance Criteria**:
  - [ ] resolveAgentMention("@commander hello", undefined, cfg) returns "commander"
  - [ ] resolveAgentMention("hello", undefined, cfg) returns null (no mention)
  - [ ] resolveAgentMention("@engineer test", entities, cfg) returns "engineer" (existing behavior)

  **QA Scenarios**:

  Scenario: Test mention detection in text without entities
  Tool: Bash
  Preconditions: Function fixed, test file exists
  Steps: 1. Run `pnpm test src/routing/resolve-route.test.ts` 2. Check test output
  Expected Result: All tests pass
  Failure Indicators: Test failures, type errors
  Evidence: .sisyphus/evidence/task-2-tests-pass.txt

  ***

- [ ] 3. Add TDD tests for resolveAgentMention

  **What to do**:
  - Create src/routing/resolve-route.test.ts if not exists
  - Add tests for resolveAgentMention function:
    - Test @commander returns "commander"
    - Test @ENGINEER (case insensitive) returns "engineer"
    - Test @commander @engineer returns first match
    - Test @nonexistent returns null
    - Test text without @mention returns null
    - Test with empty text returns null

  **Must NOT do**:
  - Break existing tests
  - Add tests for unrelated functionality

  **Recommended Agent Profile**:

  > **Category**: `quick` - Test file creation
  - Reason: Straightforward test addition
    > **Skills**: []
  - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4
  - **Blocked By**: Task 2 (needs fixed function to test)

  **References**:
  - `src/routing/resolve-route.ts` - Function under test
  - `src/routing/resolve-route.test.ts` - Existing test patterns
  - `specs/002-multi-agent-os/spec.md` - Test requirements

  **WHY Each Reference Matters**:
  - resolveRoute.ts: Source to test
  - Existing tests: Test patterns and mocking
  - Spec: Test scenarios from requirements

  **Acceptance Criteria**:
  - [ ] Test file created
  - [ ] All tests pass (pnpm test src/routing/resolve-route.test.ts)
  - [ ] Coverage for all edge cases

  **QA Scenarios**:

  Scenario: Run all tests
  Tool: Bash
  Preconditions: Tests written
  Steps: 1. Run `pnpm test src/routing/resolve-route.test.ts` 2. Verify 100% pass rate
  Expected Result: All tests pass
  Failure Indicators: Any test failures
  Evidence: .sisyphus/evidence/task-3-tests-pass.txt

  ***

- [ ] 4. Verify end-to-end multi-agent routing works

  **What to do**:
  - Restart gateway with new config
  - Test routing manually or via integration test
  - Verify workspace loading per agent

  **Must NOT do**:
  - Deploy to production without verification
  - Modify production config

  **Recommended Agent Profile**:

  > **Category**: `deep` - Integration verification
  - Reason: End-to-end verification requires understanding of multiple components
    > **Skills**: []
  - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: Task 3 (tests pass first)

  **References**:
  - `src/gateway/server.impl.ts` - Gateway startup
  - `src/agents/workspace.ts` - Workspace loading
  - `src/routing/resolve-route.ts` - Route resolution

  **WHY Each Reference Matters**:
  - Gateway startup: How config is loaded
  - Workspace: How agent workspaces are resolved
  - Route: Final routing logic

  **Acceptance Criteria**:
  - [ ] Gateway starts without errors
  - [ ] openclaw agents list shows all 5 agents
  - [ ] Routing resolves to correct agent based on @mention

  **QA Scenarios**:

  Scenario: Verify gateway starts with multi-agent config
  Tool: Bash
  Preconditions: openclaw.json has agents.list
  Steps: 1. Run `openclaw gateway run` (or check status) 2. Check logs for errors
  Expected Result: Gateway starts successfully
  Failure Indicators: Startup errors, config errors
  Evidence: .sisyphus/evidence/task-4-gateway-start.txt

  Scenario: Verify agents list
  Tool: Bash
  Preconditions: Gateway running
  Steps: 1. Run `openclaw agents list` 2. Verify output shows 5 agents
  Expected Result: 5 agents listed
  Failure Indicators: Missing agents, errors
  Evidence: .sisyphus/evidence/task-4-agents-list.txt

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Config Validation** — `quick`
      Verify openclaw.json has correct multi-agent config: agents.list with 5 entries, mentionPatterns, agentDir, default flag on commander.
      Output: `Config [VALID/INVALID] | Agents [N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Routing Logic Review** — `unspecified-high`
      Read resolve-route.ts and verify fix doesn't break existing entity-based detection. Run routing unit tests.
      Output: `Logic [CORRECT/BUGGY] | Tests [PASS/FAIL] | VERDICT`

- [ ] F3. **Test Coverage Review** — `unspecified-high`
      Verify TDD tests cover all edge cases: @commander, @ENGINEER (case), @nonexistent, no mention, empty text.
      Output: `Coverage [N/N cases] | VERDICT`

- [ ] F4. **Integration Verification** — `deep`
      Start gateway, run openclaw agents list, verify workspace loading for each agent.
      Output: `Gateway [OK/ERROR] | Agents [N] | Workspaces [N/N loaded] | VERDICT`

---

## Commit Strategy

- Task 1: `config: add multi-agent config to openclaw.json` — openclaw.json
- Task 2: `fix: resolveAgentMention checks text patterns` — src/routing/resolve-route.ts
- Task 3: `test: add TDD tests for resolveAgentMention` — src/routing/resolve-route.test.ts
- Task 4: `test: integration verification` — (no changes)

---

## Success Criteria

### Verification Commands

```bash
openclaw config get agents.list  # Expected: 5 agents
openclaw doctor                  # Expected: No errors
pnpm test src/routing/resolve-route.test.ts  # Expected: All pass
openclaw agents list            # Expected: 5 agents
```

### Final Checklist

- [ ] All 5 agents configured in openclaw.json
- [ ] resolveAgentMention returns correct agentId for @mentions
- [ ] All routing tests pass
- [ ] Gateway starts without errors
- [ ] Single-agent mode still works (backward compatibility)

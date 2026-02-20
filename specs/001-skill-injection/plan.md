# Implementation Plan: Skill Injection System

**Branch**: `001-skill-injection` | **Date**: 2026-02-19 | **Spec**: [spec.md](./spec.md)

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

A skill injection system for hierarchical agent orchestration that enables explicit skill definition, registration, composition, and validation before sub-agent spawning. The system adds an optional `skills` parameter to `sessions_spawn` to inject tool permission constraints into sub-agents, following a "most restrictive wins" conflict resolution strategy.

**Key insight**: The codebase already has a skill system (`src/agents/skills/`) focused on workspace skills with installation and command dispatch. This feature adds a NEW parallel skill system for **sub-agent capability permissions** — a distinct concept from the existing workspace skill loader.

## Technical Context

**Language/Version**: TypeScript / Node.js 22+  
**Primary Dependencies**: Existing OpenClaw agent tools, TypeBox for schemas, existing skill subsystem  
**Storage**: In-memory for session (as specified in spec)  
**Testing**: Vitest (existing test framework)  
**Target Platform**: Gateway (Linux/macOS)  
**Project Type**: Single TypeScript project with existing tool/plugin architecture  
**Performance Goals**: Validation < 50ms per spawn request (from SC-002)  
**Constraints**: Must preserve existing spawn behavior when `skills` not provided  
**Scale/Scope**: Core feature affecting sub-agent orchestration only

### Codebase Analysis

| Component             | Location                                  | Current State                                                                        | Skill Injection Impact                |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| `sessions_spawn` tool | `src/agents/tools/sessions-spawn-tool.ts` | Parameters: task, label, model, thinking, timeout, retry, etc. — **no skills param** | ADD: `skills?: string[]` param        |
| Sub-agent spawn logic | `src/agents/subagent-spawn.ts`            | Validates depth, max children, agent allowlist, thinking                             | ADD: skill validation before spawn    |
| Tool policy           | `src/agents/pi-tools.policy.ts`           | `SUBAGENT_TOOL_DENY_ALWAYS`, depth-based denial                                      | ENHANCE: skill-based tool filtering   |
| Tool profiles         | `src/agents/tool-policy.ts`               | Profiles: minimal, coding, messaging, full                                           | REFERENCE: existing profile pattern   |
| System prompt builder | `src/agents/subagent-announce.ts`         | `buildSubagentSystemPrompt()`                                                        | ENHANCE: inject skill constraints     |
| Existing skills       | `src/agents/skills/`                      | Workspace skill loader with commands/dispatch                                        | PARALLEL: new capability skill system |

### Architecture Decision

**Option**: Create NEW skill system in `src/agents/skills/` alongside existing workspace skills.

**Rationale**:

- Existing skills (`src/agents/skills/`) handle workspace skill installation, commands, and dispatch — different concern
- New skill system is for **sub-agent permission scoping** — tracks `allowed_tools`, `forbidden_tools`, `composability_rules`
- Keeps concerns separated; doesn't overload existing skill types

### Key Implementation Files to Create

```
src/agents/skills/
├── types.ts              # EXISTS - extend with SkillDefinition, ComposedSkill, ValidationResult
├── registry.ts          # NEW - SkillRegistry class
├── selector.ts         # NEW - Context-aware skill selector
├── validation.ts       # NEW - Validation layer
└── definitions/
    ├── coding.ts       # NEW - specification-engine, opencode-implementer skills
    └── index.ts        # NEW - exports
```

### Key Implementation Files to Modify

```
src/agents/
├── tools/sessions-spawn-tool.ts    # ADD skills param to schema
├── subagent-spawn.ts               # ADD skill validation, pass to system prompt
└── subagent-announce.ts            # INJECT skill constraints into prompt
```

### NEEDS CLARIFICATION

| Item                             | Question                                                                                                                             | Resolution Approach                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Tool name for `specKit`          | "specKit" tool doesn't exist in codebase — is this a new tool to create, or a reference to an existing tool with different name?     | Create new `specKit` tool (or alias to existing)                   |
| Tool name for `opencode`         | "opencode" in codebase refers to model provider (opencode.ai), not a tool. Should skill use "opencode" tool or different identifier? | Use distinct tool name like `opencode-executor` to avoid confusion |
| `execution_protocol` enforcement | Spec says protocol ordering is "advisory" — should we validate protocol completeness at spawn time?                                  | Keep as warning-only for Phase 1                                   |
| Persistence                      | Spec says in-memory only, but should registry survive session resets?                                                                | In-memory for now, extendable later                                |

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Note**: No constitution.md found at `.specify/memory/constitution.md`. Assuming default gates apply:

| Gate                            | Status  | Notes                     |
| ------------------------------- | ------- | ------------------------- |
| Single project (not multi-repo) | ✅ PASS | Single TypeScript project |
| No new databases                | ✅ PASS | In-memory skill registry  |
| No new external services        | ✅ PASS | All internal              |
| Testing with existing framework | ✅ PASS | Vitest already in use     |

## Project Structure

### Documentation (this feature)

```text
specs/001-skill-injection/
├── plan.md              # This file
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/agents/skills/
├── types.ts              # MODIFY - extend with new skill types
├── registry.ts           # CREATE - SkillRegistry class
├── selector.ts           # CREATE - context-aware selector
├── validation.ts         # CREATE - validation layer
├── definitions/
│   ├── coding.ts         # CREATE - coding skills
│   └── index.ts         # CREATE - exports
├── subagent.ts          # MODIFY - add skill injection to sub-agent spawn
└── [existing files]     # KEEP - workspace skill system

src/agents/
├── tools/
│   └── sessions-spawn-tool.ts   # MODIFY - add skills param
├── subagent-spawn.ts            # MODIFY - skill validation
└── subagent-announce.ts         # MODIFY - inject skill constraints

tests/
└── [existing test structure]
```

**Structure Decision**: Extending existing `src/agents/skills/` directory for new capability-based skill system. Creating parallel to existing workspace skill loader (which handles installation/commands).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed                                                                         | Simpler Alternative Rejected Because                               |
| -------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Adding new skill subsystem | Existing skills are for workspace installation/dispatch, not sub-agent permissions | Could overload existing types, but violates separation of concerns |

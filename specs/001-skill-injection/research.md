# Research: Skill Injection System

**Generated**: 2026-02-19  
**Feature**: 001-skill-injection

## Decisions Made

### 1. Skill System Architecture

**Decision**: Create NEW skill system in `src/agents/skills/` alongside existing workspace skills.

**Rationale**:

- Existing skills in `src/agents/skills/` handle workspace skill installation, commands, and dispatch
- New skill system is for **sub-agent permission scoping** — tracks `allowed_tools`, `forbidden_tools`, `composability_rules`
- Separation of concerns: capability permissions ≠ workspace skill management

**Alternatives Considered**:

- Extend existing `SkillEntry` type — rejected: mixes different concerns
- Create separate module `src/agents/skill-injection/` — rejected: unnecessarily separated from related code

---

### 2. Tool Names: specKit and opencode

**Decision**: Create new tool identifiers rather than aliasing existing ones.

**Rationale**:

- `specKit` does not exist in codebase — will be created as new tool
- `opencode` in codebase refers to model provider (opencode.ai), not a tool — use `opencode-executor` to avoid confusion

**Implementation**:

- `specKit` tool: New tool for specification generation (future work, referenced by skill)
- `opencode-executor` tool: Wrapper/tool for code execution (future work)

---

### 3. Tool Gating Implementation

**Decision**: Use system prompt injection for skill constraints, not modify existing tool policy pipeline.

**Rationale**:

- Existing tool policy (`pi-tools.policy.ts`) uses depth-based denial lists
- Adding skill-based filtering would require modifying the policy resolution pipeline
- System prompt injection is non-invasive and can be removed without affecting core policy

**Implementation**:

- `buildSubagentSystemPrompt()` will receive skill constraints
- Constraints injected as rules in the system prompt
- Tool execution layer continues to use existing policy (future enhancement possible)

---

### 4. Validation Strategy

**Decision**: Validate at spawn time (synchronous), not at tool call time.

**Rationale**:

- Spawn happens once, tool calls happen many times per session
- Early rejection prevents misconfigured sub-agents from starting
- SC-002 requires < 50ms rejection — spawn-time validation is fast

---

### 5. Registry Storage

**Decision**: In-memory only, scoped to primary agent orchestration layer.

**Rationale**:

- Spec explicitly says "in-memory for the session lifetime"
- Sub-agents do not have write access to registry
- Primary agent can register new skills at runtime

---

## Resolved Clarifications

| Clarification                    | Resolution                                               |
| -------------------------------- | -------------------------------------------------------- |
| Tool name for `specKit`          | Create as new tool (referenced by skill definition)      |
| Tool name for `opencode`         | Use `opencode-executor` to avoid confusion with provider |
| `execution_protocol` enforcement | Warning-only at registration (advisory)                  |
| Persistence                      | In-memory only, session-scoped                           |

---

## Key Codebase References

| File                                      | Purpose                               | Relevance                     |
| ----------------------------------------- | ------------------------------------- | ----------------------------- |
| `src/agents/tools/sessions-spawn-tool.ts` | Tool definition + execute             | Add `skills` param here       |
| `src/agents/subagent-spawn.ts`            | Spawn logic + validation              | Add skill validation here     |
| `src/agents/subagent-announce.ts`         | System prompt builder                 | Inject skill constraints here |
| `src/agents/pi-tools.policy.ts`           | Tool policy for sub-agents            | Reference for tool filtering  |
| `src/agents/tool-policy.ts`               | Tool profiles (minimal, coding, etc.) | Reference for profile pattern |
| `src/agents/skills/types.ts`              | Existing skill types                  | Extend, don't replace         |

---

## Pattern: Skill Composition (Most Restrictive Wins)

```
Skill A: allowed_tools: ["read", "write"], forbidden_tools: []
Skill B: allowed_tools: ["read", "execute"], forbidden_tools: ["write"]

Composed:
- Intersection of allowed: ["read"]
- Union of forbidden: ["write"]
- Result: allowed = ["read"], forbidden = ["write"]
```

This ensures no tool can be accessed if ANY skill forbids it.

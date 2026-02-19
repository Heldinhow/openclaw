# Feature Specification: Skill Injection System

**Feature Branch**: `001-skill-injection`  
**Created**: 2026-02-19  
**Status**: Draft  
**Input**: User description: "Skill Injection System Specification — Explicit skill injection for hierarchical agent orchestration architecture"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Define and Register Skills (Priority: P1)

As a developer building an agent orchestration system, I need to define skills with explicit tool permissions and register them in a central registry, so that sub-agents can only access the tools their assigned skills explicitly allow.

**Why this priority**: This is the foundational building block. Without a skill definition model and registry, no other part of the system can function. It delivers immediate value by establishing the permission contract between the primary agent and sub-agents.

**Independent Test**: Can be fully tested by defining a skill with `allowed_tools` and `forbidden_tools`, registering it, retrieving it by name, and verifying that the permission sets are exactly as declared — no more, no less.

**Acceptance Scenarios**:

1. **Given** a skill definition with `name`, `description`, `allowed_tools: ["specKit"]`, and `forbidden_tools: ["write", "edit"]`, **When** the skill is registered in the registry, **Then** the registry stores it and returns it unmodified when queried by name.
2. **Given** a registered skill, **When** a tool not in `allowed_tools` is requested, **Then** the registry reports the tool as unauthorized for that skill.
3. **Given** two versions of the same skill are registered, **When** `overrideSkillVersion` is called with the newer version, **Then** subsequent lookups return the overridden version.
4. **Given** a skill definition with no `forbidden_tools` field, **When** the skill is registered, **Then** the system treats `forbidden_tools` as an empty set (no implicit permissions are granted beyond `allowed_tools`).

---

### User Story 2 - Compose Skills and Enforce Conflict Resolution (Priority: P2)

As a developer orchestrating a coding task, I need to compose multiple skills together and have the system enforce a "most restrictive wins" conflict resolution strategy, so that if any skill in a set forbids a tool, that tool remains unavailable to the sub-agent regardless of what other skills allow.

**Why this priority**: Composition and conflict resolution are the core safety mechanism. Once skills can be defined and registered, composing them correctly is the next critical step to prevent privilege escalation through skill stacking.

**Independent Test**: Can be fully tested by composing a skill set where one skill allows a tool and another forbids it, verifying the composed result forbids the tool, and confirming the composed skill cannot be used to access that tool.

**Acceptance Scenarios**:

1. **Given** skill A allows `["write", "opencode"]` and skill B forbids `["write"]`, **When** skills A and B are composed, **Then** the composed skill has `["opencode"]` as its effective allowed tools, with `"write"` forbidden.
2. **Given** a set of compatible skills, **When** `composeSkills` is called, **Then** the resulting composed skill has a valid `allowed_tools` set that is the intersection of all skills' allowed tools minus any forbidden tools from any skill.
3. **Given** a composed skill with `forbidden_tools` from any member, **When** the composed skill's tool permissions are inspected, **Then** forbidden tools never appear in the effective allowed list.

---

### User Story 3 - Validate Skill Sets Before Sub-Agent Spawn (Priority: P3)

As a developer spawning sub-agents, I need the system to validate the requested skill set before a spawn is accepted, so that incompatible combinations, missing required companion skills, and unauthorized tools are caught at spawn time rather than at runtime.

**Why this priority**: Validation prevents incomplete pipelines and misconfigured sub-agents from being spawned silently. A spawn with `opencode-implementer` but without `specification-engine` would create an invalid workflow; this must be rejected proactively.

**Independent Test**: Can be fully tested by attempting to spawn a sub-agent with `["opencode-implementer"]` alone (missing `specification-engine`) and verifying the spawn is rejected with a descriptive error before any sub-agent process starts.

**Acceptance Scenarios**:

1. **Given** a spawn request with `skills: ["opencode-implementer"]` and no `specification-engine`, **When** the spawn is attempted, **Then** it is rejected with a `ValidationError` identifying the missing required companion skill.
2. **Given** a spawn request with an unrecognized skill name, **When** the spawn is attempted, **Then** it is rejected with a `ValidationError` listing the unknown skill.
3. **Given** a spawn request with a valid, compatible set of skills, **When** `validateSkillSet` runs, **Then** it returns `{ valid: true, errors: [], warnings: [] }` and the spawn proceeds.
4. **Given** a spawn request where one skill's `composability_rules` declares incompatibility with another skill in the set, **When** the spawn is attempted, **Then** it is rejected with a `ValidationError` describing the incompatibility.

---

### User Story 4 - Context-Aware Skill Selection (Priority: P4)

As a developer describing a task to the primary agent, I need the system to automatically select the appropriate skills based on task context (task description, risk level, and whether it involves coding), so that coding tasks always get both `specification-engine` and `opencode-implementer` without requiring manual skill enumeration every time.

**Why this priority**: Reduces orchestration overhead for the primary agent and prevents the most common pipeline error: spawning a coding sub-agent without the specification step.

**Independent Test**: Can be fully tested by calling the skill selector with a task marked `coding: true` and verifying the returned skill list always contains both `specification-engine` and `opencode-implementer` as a pair, never one without the other.

**Acceptance Scenarios**:

1. **Given** a task with `coding: true`, **When** the context-aware skill selector runs, **Then** the returned skill list includes both `specification-engine` and `opencode-implementer`.
2. **Given** a task with `coding: false` and `riskLevel: "low"`, **When** the skill selector runs, **Then** the returned skill list does not include coding-specific skills.
3. **Given** a task where `coding: true` would result in an incomplete pipeline, **When** the selector runs, **Then** it adds the missing required companion skills automatically rather than returning a partial set.

---

### User Story 5 - Spawn Sub-Agent with Explicit Skills via sessions_spawn (Priority: P5)

As a primary agent orchestrating work, I need to spawn sub-agents with an explicit `skills` parameter on `sessions_spawn`, so that each sub-agent's tool access is precisely defined at the point of creation and cannot be expanded at runtime.

**Why this priority**: This is the integration point that ties all other stories together. The `sessions_spawn` tool must surface the skill injection capability to the primary agent in a usable way.

**Independent Test**: Can be fully tested by calling `sessions_spawn` with a `skills` array, verifying the sub-agent is created with only the tools permitted by those skills, and confirming that a tool call outside `allowed_tools` is blocked for that sub-agent.

**Acceptance Scenarios**:

1. **Given** a `sessions_spawn` call with `skills: ["specification-engine", "opencode-implementer"]`, **When** the sub-agent starts, **Then** it has access to `specKit` and `opencode` tools but not to `write` or `edit`.
2. **Given** a `sessions_spawn` call with no `skills` parameter, **When** the sub-agent starts, **Then** it uses the current default behavior (no skill restrictions applied).
3. **Given** a `sessions_spawn` call with an invalid or incomplete skill set, **When** validation runs, **Then** the spawn is rejected before the sub-agent process is created.
4. **Given** a spawned sub-agent with skills injected, **When** it attempts to use a tool outside its `allowed_tools`, **Then** the tool call is blocked and the sub-agent receives an error explaining the restriction.

---

### Edge Cases

- What happens when `composeSkills` is called with an empty list? The system returns a composed skill with no allowed tools and no forbidden tools (zero-capability state), not an error.
- What happens when the same skill is listed twice in a spawn request? The system deduplicates silently; the skill counts as present once.
- What happens when `overrideSkillVersion` is called for a skill not yet registered? The system registers it as a new skill (same behavior as `registerSkill`).
- What happens when a sub-agent tries to call `sessions_spawn` itself to spawn another sub-agent with broader skills than its own? The sub-agent does not carry registry write access; the new spawn is validated independently by the primary agent's registry.
- What happens when a skill's `execution_protocol` lists a step that requires a tool not in `allowed_tools`? The validation layer detects and reports it as a warning at registration time.
- What happens if `forbidden_tools` and `allowed_tools` overlap for a single skill? Forbidden takes precedence within the same skill (consistent with "most restrictive wins").

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a `Skill` definition model with `name`, `description`, `allowed_tools`, and `execution_protocol` as required fields; `version`, `forbidden_tools`, `preconditions`, `postconditions`, `output_contract`, `compatibility_rules`, and `composability_rules` as optional fields.
- **FR-002**: Skills MUST NOT grant implicit permissions; every permitted tool must appear explicitly in `allowed_tools`.
- **FR-003**: The system MUST provide a `SkillRegistry` with operations to register, retrieve by name, validate a skill set, compose multiple skills, list all available skills, and version-override an existing skill.
- **FR-004**: Composing multiple skills MUST apply "most restrictive wins": if any skill in the set forbids a tool, that tool is unavailable in the composed result regardless of what other skills allow.
- **FR-005**: The system MUST provide a `validateSkillSet` operation returning `{ valid, errors, warnings }`, checking for: unknown skill names, missing required composability companions, and declared incompatibilities between skills.
- **FR-006**: The system MUST provide a context-aware skill selector accepting task description, risk level, and a `coding` boolean, returning the appropriate skill list for the context.
- **FR-007**: When `coding: true`, the skill selector MUST always include both `specification-engine` and `opencode-implementer` in the returned list; it MUST NOT return one without the other.
- **FR-008**: The `sessions_spawn` tool MUST accept an optional `skills` parameter (array of skill name strings).
- **FR-009**: When `skills` is provided to `sessions_spawn`, the system MUST validate the skill set before creating any sub-agent process; invalid sets cause rejection with a descriptive error.
- **FR-010**: The `opencode-implementer` skill MUST declare `forbidden_tools` including at minimum `write` and `edit`, and MUST declare `specification-engine` as a required composability companion.
- **FR-011**: The `specification-engine` skill MUST be limited to `allowed_tools: ["specKit"]` and MUST declare `opencode-implementer` as a required composability companion.
- **FR-012**: When `sessions_spawn` is called without a `skills` parameter, the sub-agent MUST use existing default behavior without any skill-based restrictions.
- **FR-013**: The primary agent MUST NOT be able to inject permissions into itself via the skill system; skill injection applies exclusively to sub-agents spawned via `sessions_spawn`.
- **FR-014**: The skill registry MUST support extension at any time: new skills via `registerSkill`, existing skill versions via `overrideSkillVersion`, without requiring restart.

### Key Entities

- **Skill**: The atomic unit of capability. Carries an explicit permitted tool list, optional forbidden tools, an ordered execution protocol, and optional composability and compatibility rules. Named and optionally versioned.
- **ComposedSkill**: Runtime construct derived from merging multiple skills. Effective permissions use "most restrictive wins" across all members. Not independently registerable.
- **SkillRegistry**: Authoritative in-session store for all registered skills. Provides lookup, validation, composition, listing, and version override. Write access belongs only to the primary agent.
- **ValidationResult**: Output of skill set validation. Contains `valid` (boolean), `errors` (array of `ValidationError`), and `warnings` (array of strings).
- **ValidationError**: Structured error with a code and human-readable message identifying the offending skill(s) and violated rule.
- **SubagentSpawnRequest**: Extended spawn request that includes an optional `skills` array. When present, the orchestration layer validates and composes skills before creating the sub-agent process.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of sub-agent tool calls that fall outside the skill-defined `allowed_tools` are blocked before execution — zero unauthorized tool executions reach the sub-agent runtime.
- **SC-002**: A spawn request with an invalid or incomplete skill set is rejected with a descriptive error message before any sub-agent process is created, in under 50 milliseconds.
- **SC-003**: Composing any number of compatible skills produces a deterministic `ComposedSkill`; "most restrictive wins" is applied in 100% of compositions with no exceptions.
- **SC-004**: The context-aware skill selector produces a complete, valid skill set for every `coding: true` task without manual intervention — no incomplete coding pipelines.
- **SC-005**: New skills can be registered and immediately used in spawn requests within the same session, with no restart or reinitialization required.
- **SC-006**: The validation layer catches 100% of composability rule violations (missing companions, incompatible pairs) at validation time, before any sub-agent work begins.
- **SC-007**: A sub-agent spawned without a `skills` parameter behaves identically to pre-feature behavior — zero regressions in default spawn behavior.

## Assumptions

- The primary agent's orchestration layer has access to the `SkillRegistry` at spawn time; sub-agents do not have write access to the registry.
- `sessions_spawn` already exists in the codebase (`src/agents/tools/sessions-spawn-tool.ts`); this feature adds the optional `skills` parameter to it without changing existing behavior when `skills` is omitted.
- `specKit` and `opencode` are existing tool identifiers in the system; this feature references them by name in skill definitions without modifying the tools themselves.
- Skill definitions are in-memory for the session lifetime; persistence across sessions (e.g., to disk) is out of scope for this feature.
- The `execution_protocol` field is an ordered list of strings describing steps; enforcement of protocol ordering is advisory in this iteration.
- The subtypes `OutputContract`, `CompatibilityRule`, and `ComposabilityRule` will be defined as part of `types.ts` with reasonable initial shapes; their full semantics will be refined during planning.

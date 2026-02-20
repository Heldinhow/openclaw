# Contracts: Skill Injection System

**Generated**: 2026-02-19

This document defines the API contracts for the Skill Injection System.

---

## 1. SkillRegistry API

### 1.1 registerSkill

Register a new skill in the registry.

```typescript
// TypeScript interface
interface RegisterSkillParams {
  skill: SkillDefinition;
}

interface RegisterSkillResult {
  success: boolean;
}
```

### 1.2 getSkill

Retrieve a skill by name.

```typescript
// TypeScript interface
interface GetSkillParams {
  name: string;
}

interface GetSkillResult {
  skill: SkillDefinition | undefined;
}
```

### 1.3 validateSkillSet

Validate a set of skills before spawn.

```typescript
// TypeScript interface
interface ValidateSkillSetParams {
  skills: string[];
}

interface ValidateSkillSetResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}
```

### 1.4 composeSkills

Compose multiple skills into a single effective skill.

```typescript
// TypeScript interface
interface ComposeSkillsParams {
  skills: string[];
}

interface ComposeSkillsResult {
  composed: ComposedSkill;
}
```

### 1.5 listAvailableSkills

List all registered skills.

```typescript
// TypeScript interface
interface ListAvailableSkillsParams {}

interface ListAvailableSkillsResult {
  skills: SkillDefinition[];
}
```

### 1.6 overrideSkillVersion

Override an existing skill's version.

```typescript
// TypeScript interface
interface OverrideSkillVersionParams {
  name: string;
  version: string;
}

interface OverrideSkillVersionResult {
  success: boolean;
}
```

---

## 2. SkillSelector API

### 2.1 selectSkills

Context-aware skill selection.

```typescript
// TypeScript interface
interface SelectSkillsParams {
  taskDescription: string;
  riskLevel: "low" | "medium" | "high";
  coding: boolean;
}

interface SelectSkillsResult {
  skills: string[];
}
```

**Rules**:

- If `coding === true`, returns `["specification-engine", "opencode-implementer"]`
- If `coding === false`, returns context-appropriate skills (empty or minimal)

---

## 3. sessions_spawn Tool Extension

### 3.1 Schema Extension

```typescript
// Add to existing sessions_spawn tool schema
{
  "skills": {
    "type": "array",
    "items": { "type": "string" },
    "description": "Skills to inject into sub-agent",
    "optional": true
  }
}
```

### 3.2 Execution Flow

```
1. Receive spawn request with optional skills[]
2. If skills is undefined/empty → use existing default behavior
3. If skills is provided:
   a. Validate skill set via SkillRegistry.validateSkillSet()
   b. If invalid → reject with ValidationError
   c. Compose skills via SkillRegistry.composeSkills()
   d. Inject constraints into sub-agent system prompt
   e. Proceed with spawn
```

---

## 4. Error Codes

| Code                  | Description                          |
| --------------------- | ------------------------------------ |
| `UNKNOWN_SKILL`       | Skill name not found in registry     |
| `MISSING_REQUIRED`    | Required companion skill not present |
| `INCOMPATIBLE_SKILLS` | Incompatible skill combination       |
| `TOOL_NOT_ALLOWED`    | Tool not in allowed_tools            |
| `TOOL_FORBIDDEN`      | Tool explicitly forbidden            |

---

## 5. Integration Points

| Point             | Module                 | Method                        |
| ----------------- | ---------------------- | ----------------------------- |
| Skill validation  | `SkillRegistry`        | `validateSkillSet()`          |
| Skill composition | `SkillRegistry`        | `composeSkills()`             |
| Context selection | `SkillSelector`        | `selectSkills()`              |
| Spawn integration | `subagent-spawn.ts`    | `spawnSubagentDirect()`       |
| Prompt injection  | `subagent-announce.ts` | `buildSubagentSystemPrompt()` |

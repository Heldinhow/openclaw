# Feature Specification: Result Aggregation

**Feature Branch**: `[001-result-aggregation]`  
**Created**: 2026-02-18  
**Status**: Draft  
**Input**: User description: "Result Aggregation

O que é?

Permite coletar resultados de múltiplos sub-agents em uma única variável, ao invés de receber cada um separadamente.

Como funciona hoje:
// Hoje: você spawna múltiplos sub-agents e recebe cada resultado separadamente
sessions_spawn({ task: "pesquisar tema A" })  // → resultado 1
sessions_spawn({ task: "pesquisar tema B" })  // → resultado 2  
sessions_spawn({ task: "pesquisar tema C" })  // → resultado 3

// Você precisa manualmente combinar esses resultados
Como seria com Aggregation:
// Spawn com collectInto - todos os resultados vão para mesma variável
sessions_spawn({
  task: "pesquisar tema A",
  collectInto: "$pesquisa",
  mergeStrategy: "concat"
})

sessions_spawn({
  task: "pesquisar tema B", 
  collectInto: "$pesquisa",
  mergeStrategy: "concat"
})

sessions_spawn({
  task: "pesquisar tema C",
  collectInto: "$pesquisa",
  mergeStrategy: "concat"
})

// Parent acessa:
const resultados = subagentResults["$pesquisa"]
// → ["Resultado A", "Resultado B", "Resultado C"]
Estratégias de merge:
| Estratégia | Exemplo                    |
| ---------- | -------------------------- |
| concat     | ["a", "b", "c"]            |
| json       | { "a": {...}, "b": {...} } |
| merge      | mescla objetos deep        |
| first      | usa só o primeiro          |
| last       | usa só o último            |
| custom     | função customizada         |
Casos de uso:

1. Pesquisa分散 - várias fontes → umaaggregate
2. Processamento paralelo - mesma task com diferentes inputs
3. Análise multi-perspectiva - diferentes ângulos do mesmo tema
4. Coleta de métricas - múltiplos checks → relatório único

Exemplo real:
// Pesquisar o mesmo tema em fontes diferentes
sessions_spawn({
  task: "Pesquisar MiniMax M2.5 no Reddit",
  collectInto: "$research",
  mergeStrategy: "concat"
})

sessions_spawn({
  task: "Pesquisar MiniMax M2.5 no Twitter/X",
  collectInto: "$research", 
  mergeStrategy: "concat"
})

sessions_spawn({
  task: "Pesquisar MiniMax M2.5 no YouTube",
  collectInto: "$research",
  mergeStrategy: "concat"
})

// Resultado agregado automaticamente
// → "Reddit: ...\n\nTwitter: ...\n\nYouTube: ..."
Quer que eu implemente isso? 🦾 vamos especificar essa feature"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Parallel Research Aggregation (Priority: P1)

A parent agent needs to gather information from multiple sources simultaneously and receive a unified result instead of handling each sub-agent response individually.

**Why this priority**: This is the core use case that defines the feature. Without this capability, the aggregation feature has no practical value.

**Independent Test**: Can be tested by spawning 3 sub-agents with different research tasks, each using `collectInto: "$research"` with `mergeStrategy: "concat"`, and verifying that the parent receives a combined array/string of all results via `subagentResults["$research"]`.

**Acceptance Scenarios**:

1. **Given** a parent agent spawns 3 sub-agents with `collectInto: "$research"` and `mergeStrategy: "concat"`, **When** all sub-agents complete successfully, **Then** the parent agent can access `subagentResults["$research"]` as an aggregated result containing all individual responses.

2. **Given** a parent agent spawns sub-agents with different variable names for `collectInto`, **When** they complete, **Then** each variable in `subagentResults` contains only the results from sub-agents that used that specific variable name.

---

### User Story 2 - Multiple Merge Strategies (Priority: P2)

Users need different ways to combine sub-agent results based on their data structure and use case requirements.

**Why this priority**: Different use cases require different aggregation behaviors. The ability to choose between concatenation, JSON merging, deep object merging, or selecting first/last result provides flexibility for various scenarios.

**Independent Test**: Can be tested by spawning sub-agents with different `mergeStrategy` values and verifying that the aggregated result matches the expected behavior for each strategy type.

**Acceptance Scenarios**:

1. **Given** sub-agents use `mergeStrategy: "concat"`, **When** results are aggregated, **Then** the output is an array containing all individual results in order.

2. **Given** sub-agents use `mergeStrategy: "json"`, **When** results are aggregated, **Then** the output is an object with keys mapped to each result (or indexed if no keys provided).

3. **Given** sub-agents use `mergeStrategy: "merge"`, **When** results are aggregated, **Then** the output is a deeply merged object combining all results.

4. **Given** sub-agents use `mergeStrategy: "first"` or `"last"`, **When** results are aggregated, **Then** the output contains only the first or last result respectively.

---

### User Story 3 - Custom Merge Function (Priority: P3)

Advanced users need the ability to define custom aggregation logic beyond the built-in strategies.

**Why this priority**: Provides maximum flexibility for complex scenarios where built-in strategies don't meet requirements. Allows users to implement domain-specific aggregation logic.

**Independent Test**: Can be tested by providing a custom merge function and verifying that the aggregated result matches the expected output defined by that function.

**Acceptance Scenarios**:

1. **Given** a sub-agent uses `mergeStrategy: "custom"` with a custom function, **When** results are aggregated, **Then** the custom function is applied to combine all results.

---

### User Story 4 - Error Handling with Partial Results (Priority: P2)

The system should handle scenarios where some sub-agents fail while others succeed.

**Why this priority**: In production environments, some sub-agents may fail due to network issues, timeouts, or other errors. The aggregation should still return successful results rather than completely failing.

**Independent Test**: Can be tested by spawning multiple sub-agents where one intentionally fails, and verifying that the aggregated result contains successful results (based on the merge strategy) and appropriate error handling.

**Acceptance Scenarios**:

1. **Given** some sub-agents in an aggregation group fail, **When** aggregation is attempted, **Then** successful results are included in the output and failures are either reported or skipped based on configuration.

---

### Edge Cases

- What happens when no sub-agents use a particular `collectInto` variable name? → The variable should exist in `subagentResults` but be empty or undefined.
- How does the system handle concurrent sub-agents completing at different times? → Results should be accumulated as each sub-agent completes, with final aggregation triggered when all in the group finish or a timeout occurs.
- What happens if a sub-agent is spawned without `collectInto`? → It should behave as before (returning results individually, not aggregated).
- How are duplicate variable names handled across different aggregation groups? → Each `collectInto` value creates its own aggregation group; same name = same group.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow sub-agents to specify a `collectInto` parameter containing a variable name (prefixed with `$`) to indicate which aggregation group they belong to.
- **FR-002**: System MUST support the following merge strategies: `concat` (array concatenation), `json` (keyed object), `merge` (deep object merge), `first` (use first result), `last` (use last result), and `custom` (user-defined function).
- **FR-003**: System MUST provide access to aggregated results via a `subagentResults` object that maps variable names to their aggregated content.
- **FR-004**: System MUST ensure that sub-agents belonging to the same `collectInto` group are tracked together until all have completed.
- **FR-005**: System MUST handle errors gracefully when some sub-agents in an aggregation group fail, preserving successful results.
- **FR-006**: System MUST allow sub-agents without `collectInto` to function independently (existing behavior preserved).

### Key Entities

- **AggregationGroup**: Represents a collection of sub-agents that share the same `collectInto` variable name and merge strategy. Tracks all sub-agents in the group and their individual results.
- **MergeStrategy**: Defines how individual sub-agent results are combined. Can be built-in (concat, json, merge, first, last) or custom.
- **SubAgentResult**: Represents the output from a single sub-agent that contributes to an aggregation group.
- **AggregatedResult**: The final combined output accessible via `subagentResults` after all sub-agents in a group have completed.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can spawn at least 10 sub-agents with the same `collectInto` variable and receive a single aggregated result.
- **SC-002**: The aggregation process adds no more than 500ms overhead compared to individual sub-agent execution (for same number of agents).
- **SC-003**: All 6 merge strategies (concat, json, merge, first, last, custom) produce correct results as documented.
- **SC-004**: When 50% of sub-agents in an aggregation group fail, the remaining 50% successful results are still accessible via `subagentResults`.
- **SC-005**: Users can access aggregated results immediately after all sub-agents in a group complete, without additional API calls.

---

## Assumptions

- The feature builds on top of the existing `sessions_spawn` functionality.
- Sub-agents continue to return their individual results in addition to contributing to aggregation (backward compatibility).
- The implementation will be in TypeScript/JavaScript given the existing codebase.
- Custom merge functions will be provided as JavaScript code strings that are evaluated safely.

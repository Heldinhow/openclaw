# Data Model: Result Aggregation

**Feature**: Result Aggregation (001-result-aggregation)

## Entities

### AggregationGroup

Represents a collection of sub-agents that share the same `collectInto` variable name and merge strategy.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier for the group |
| sessionKey | string | Parent session that spawned the sub-agents |
| variableName | string | The collectInto variable (e.g., "$research") |
| mergeStrategy | MergeStrategy | Strategy for combining results |
| subAgentRunIds | string[] | List of sub-agent run IDs in this group |
| results | SubAgentResult[] | Individual results as they arrive |
| status | "pending" \| "partial" \| "complete" | Current state |
| createdAt | number | Timestamp when group was created |
| completedAt? | number | Timestamp when all sub-agents finished |

### MergeStrategy

Enum defining how results are combined.

| Value | Description |
|-------|-------------|
| concat | Concatenate into array: [a, b, c] |
| json | Keyed object: { "0": a, "1": b, "2": c } |
| merge | Deep object merge (recursive) |
| first | Return first result only |
| last | Return last result only |
| custom | Apply custom function |

### SubAgentResult

Individual result from a single sub-agent.

| Field | Type | Description |
|-------|------|-------------|
| runId | string | Sub-agent run identifier |
| sessionKey | string | Sub-agent session key |
| status | "success" \| "error" \| "timeout" | Result status |
| output? | string | Result content (if success) |
| error? | string | Error message (if error) |
| completedAt | number | When this sub-agent finished |

### AggregatedResult

The final combined output accessible via subagentResults.

| Field | Type | Description |
|-------|------|-------------|
| variableName | string | The collectInto variable name |
| strategy | MergeStrategy | Strategy used |
| value | any | The merged/aggregated value |
| errors | string[] | Error messages from failed sub-agents |
| completedAt | number | When aggregation finished |

## Relationships

```
Parent Session
    │
    ├── AggregationGroup ("$research")
    │   ├── subAgentRunIds[0] → SubAgentResult
    │   ├── subAgentRunIds[1] → SubAgentResult
    │   └── subAgentRunIds[2] → SubAgentResult
    │
    └── AggregationGroup ("$metrics")
        └── ...
```

## Validation Rules

1. `collectInto` must be a non-empty string starting with `$`
2. `mergeStrategy` must be one of: concat, json, merge, first, last, custom
3. When `mergeStrategy` is "custom", a `customFunction` string must be provided
4. Aggregation groups are scoped to parent session - different sessions have independent groups
5. Maximum 10 sub-agents per aggregation group (SC-001)

## State Transitions

```
pending → partial → complete
   │          │
   │          └── (first sub-agent completes)
   │
   └── (all sub-agents complete)
```

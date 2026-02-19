# Contracts: Result Aggregation

## Tool Extension: sessions_spawn

### Parameters (Extended)

```typescript
{
  // Existing parameters
  task: string,
  label?: string,
  agentId?: string,
  model?: string,
  thinking?: string,
  runTimeoutSeconds?: number,
  cleanup?: "delete" | "keep",
  
  // NEW: Aggregation parameters
  collectInto?: string,      // e.g., "$pesquisa", "$research"
  mergeStrategy?: "concat" | "json" | "merge" | "first" | "last" | "custom",
  customFunction?: string,   // Required only when mergeStrategy = "custom"
}
```

### Response

```typescript
{
  status: "accepted" | "forbidden" | "error",
  childSessionKey?: string,
  runId?: string,
  note?: string,
  // NEW: aggregation info
  aggregationGroup?: string,  // The collectInto variable if specified
}
```

## Context Variable: subagentResults

### Access

```typescript
// In agent context after sub-agents complete
const resultados = subagentResults["$pesquisa"]
// → ["Resultado A", "Resultado B", "Resultado C"]
```

### Type

```typescript
type SubAgentResults = {
  [variableName: string]: AggregatedResult
}

type AggregatedResult = {
  strategy: MergeStrategy,
  value: any,
  errors: string[],        // From failed sub-agents
  completedAt: number,
  count: number,           // Number of sub-agents in group
}
```

## Merge Strategy Outputs

| Strategy | Input | Output |
|----------|-------|--------|
| concat | ["a", "b", "c"] | ["a", "b", "c"] |
| json | ["a", "b", "c"] | { "0": "a", "1": "b", "2": "c" } |
| merge | [{a:1}, {b:2}] | { a: 1, b: 2 } |
| first | ["a", "b", "c"] | "a" |
| last | ["a", "b", "c"] | "c" |
| custom | [...] | (result of custom function) |

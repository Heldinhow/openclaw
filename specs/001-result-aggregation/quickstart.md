# Quickstart: Result Aggregation

## Overview

Result Aggregation allows you to collect results from multiple sub-agents into a single variable, instead of receiving each result separately.

## Basic Usage

### 1. Spawn Sub-agents with Aggregation

```typescript
// Spawn first sub-agent
sessions_spawn({
  task: "Pesquisar MiniMax M2.5 no Reddit",
  collectInto: "$research",
  mergeStrategy: "concat"
})

// Spawn second sub-agent
sessions_spawn({
  task: "Pesquisar MiniMax M2.5 no Twitter/X",
  collectInto: "$research",
  mergeStrategy: "concat"
})

// Spawn third sub-agent
sessions_spawn({
  task: "Pesquisar MiniMax M2.5 no YouTube",
  collectInto: "$research",
  mergeStrategy: "concat"
})
```

### 2. Access Aggregated Results

After all sub-agents complete, access the results:

```typescript
const resultados = subagentResults["$research"]
// → ["Reddit: ...", "Twitter: ...", "YouTube: ..."]
```

## Merge Strategies

### concat
Concatenates results into an array.

```typescript
sessions_spawn({ task: "Task A", collectInto: "$results", mergeStrategy: "concat" })
sessions_spawn({ task: "Task B", collectInto: "$results", mergeStrategy: "concat" })

// subagentResults["$results"] → ["Result A", "Result B"]
```

### json
Creates a keyed object.

```typescript
sessions_spawn({ task: "Task A", collectInto: "$data", mergeStrategy: "json" })
sessions_spawn({ task: "Task B", collectInto: "$data", mergeStrategy: "json" })

// subagentResults["$data"] → { "0": "Result A", "1": "Result B" }
```

### merge
Deep merges objects (last value wins for conflicts).

```typescript
sessions_spawn({ task: "Get user data", collectInto: "$user", mergeStrategy: "merge" })
sessions_spawn({ task: "Get preferences", collectInto: "$user", mergeStrategy: "merge" })

// subagentResults["$user"] → { name: "John", theme: "dark", ... }
```

### first / last
Returns only the first or last result.

```typescript
sessions_spawn({ task: "Search in source A", collectInto: "$search", mergeStrategy: "first" })
sessions_spawn({ task: "Search in source B", collectInto: "$search", mergeStrategy: "first" })

// subagentResults["$search"] → "Result from source A"
```

### custom
Applies a custom function.

```typescript
sessions_spawn({
  task: "Get metrics",
  collectInto: "$metrics",
  mergeStrategy: "custom",
  customFunction: "(results) => results.filter(r => r.includes('error')).join(', ')"
})
```

## Error Handling

If some sub-agents fail, successful results are still included:

```typescript
// If Task B fails:
subagentResults["$research"]
// → { 
//     value: ["Result A", "Result C"],
//     errors: ["Task B failed: timeout"],
//     count: 3
//   }
```

## Multiple Aggregation Groups

You can have multiple aggregation groups with different variable names:

```typescript
sessions_spawn({ task: "Search Reddit", collectInto: "$reddit", mergeStrategy: "concat" })
sessions_spawn({ task: "Search Twitter", collectInto: "$twitter", mergeStrategy: "concat" })

const redditResults = subagentResults["$reddit"]
const twitterResults = subagentResults["$twitter"]
```

## Backward Compatibility

Sub-agents spawned without `collectInto` work exactly as before:

```typescript
// Old behavior - still works
sessions_spawn({ task: "Some task" })
// → Returns immediately with childSessionKey
```

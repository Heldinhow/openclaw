# Agent-to-Agent Delegation Design

## Overview

Enable Commander to automatically delegate tasks to other main agents (planner, engineer, strategist, creator) by detecting when another agent's expertise is needed and sending the task to their session.

## Architecture

### Current State

- `@mention` routing already implemented (`resolveAgentMention()`)
- 5 agents configured with workspaces
- `sessions_send` tool available for inter-session messaging
- Subagent spawning via `spawnSubagent` creates subagent sessions (not main agents)

### Proposed Flow

```
User Message → Commander analyzes → Detect delegation needed →
sessions_send to target agent session → Agent processes →
Returns result → Commander delivers to user
```

## Components

### 1. Delegation Detection (Commander)

- Analyze user message intent
- Detect when another agent's expertise is needed
- Extract task description for delegation
- Pattern matching or LLM-based detection

### 2. Session Routing

- Determine target agent based on task type
- Build target session key: `agent:{targetAgent}:telegram:{chatType}:{chatId}`
- Use `sessions_send` to deliver task

### 3. Task Isolation

- Each delegation is a fresh context
- Include relevant context from Commander's analysis
- Do NOT include full conversation history

### 4. Result Aggregation

- Agent returns structured result
- Commander receives and formats response
- Delivers to user in natural language

## Technical Implementation

### Files to Modify

1. `src/agents/commander/` - Add delegation logic to Commander's workspace
2. `src/routing/resolve-route.ts` - May need enhancements for delegation detection
3. Potentially add new tool or modify existing tools

### Key Functions

- `detectDelegationNeed(message: string): { needed: boolean, targetAgent?: string, task?: string }`
- `delegateToAgent(targetAgent: string, task: string, context: object): Promise<Result>`
- `formatDelegationResult(result: object): string`

## Edge Cases

- Agent unavailable/down
- Delegation timeout
- Circular delegation (A→B→A)
- User explicitly wants Commander to handle

## Testing

- Test each agent delegation path
- Test result formatting
- Test error handling
- Test timeout scenarios

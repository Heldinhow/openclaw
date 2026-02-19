# Cancellation Feature Specification

## 1. Project Overview

**Feature:** Sub-agent Cancellation
**Type:** Tool/Functionality
**Core Functionality:** Allow cancellation of running sub-agents via a dedicated tool
**Target Users:** Main session users who spawn sub-agents and need to cancel them

## 2. Functionality Specification

### Core Features

1. **New Tool: `subagent_cancel`**
   - Adds ability to cancel running sub-agents by their run ID
   - Works with both spawned sessions and sub-agents
   - Returns confirmation of cancellation

2. **Tool Parameters:**
   - `runId` (required): The ID of the sub-agent run to cancel
   - Returns success/failure status

3. **Behavior:**
   - Cancels the target sub-agent session
   - Returns appropriate response to user
   - Handles edge cases (already completed, non-existent run)

### Implementation Details

- Add to `sessions` tool group
- Use existing session management infrastructure
- Integrate with sub-agent session tracking

## 3. Acceptance Criteria

- [x] `subagents` tool has `cancel` action available
- [x] Can cancel a running sub-agent by run ID, label, index, or "last"
- [x] Returns clear success/failure feedback
- [x] Handles non-existent run IDs gracefully
- [x] Works with the existing subagent tool suite
- [x] Supports canceling all subagents with target="all"
- [x] Cascades cancellation to child/descendant subagents

## 4. Implementation Notes

The cancellation feature is implemented via the `subagents` tool with action="cancel":

```
subagents(action="cancel", target="<runId|label|index|last|all>")
```

Key functions:

- `requestSubagentCancellation(runId)` - marks cancellation request in registry
- `cascadeCancelChildren()` - recursively cancels child subagents
- Full implementation in: `/src/agents/tools/subagents-tool.ts`

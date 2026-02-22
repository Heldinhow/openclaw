# Work Plan: @Mention Agent Routing for Telegram

## Problem Statement

Currently, when a user sends `@planner hello` in a Telegram group:

1. The routing system selects the **default agent** (Commander)
2. After routing, it checks if there was a mention (to decide IF to respond)
3. The mention of `@planner` is ignored for routing purposes

**Result:** Commander responds instead of Planner.

## Root Cause

In `src/telegram/bot-message-context.ts`:

- Line 171-180: `resolveAgentRoute()` is called WITHOUT considering message content
- Line 189: `buildMentionRegexes()` is called AFTER routing, only for gating

## Solution

Add @mention-based agent routing. When a message contains `@agentName` that matches a configured agent's `mentionPatterns`, route to that specific agent.

---

## Implementation Tasks

### Phase 1: Core Functionality

- [x] **T1**: Create `resolveAgentMention()` function in `src/routing/resolve-route.ts`
  - Input: message text + entities, config
  - Output: agentId if @mention matches any configured agent
- [x] **T2**: Modify `ResolveAgentRouteInput` to accept optional message content
  - Add `messageText?: string` and `messageEntities?` parameter
  - This allows routing to consider @mentions

- [x] **T3**: Update `resolveAgentRoute()` to use mention detection
  - If agent @mention detected, override default routing
  - Priority: explicit @mention > bindings > default

### Phase 2: Telegram Integration

- [x] **T4**: Extract @mentions from Telegram message in `bot-message-context.ts`
  - Get `msg.text` and `msg.entities`
  - Pass to routing

- [x] **T5**: Update routing call to include message content
  - Modify line 171-180 to pass message data

### Phase 3: Testing

- [x] **T6**: Add unit tests for `resolveAgentMention()`
  - Test various mention patterns
  - Test edge cases (no mention, multiple mentions)

- [x] **T7**: Manual test in Telegram
  - `@planner hello` → Planner responds
  - `@engineer help` → Engineer responds
  - `hello` (no mention) → Commander responds (default)

---

## Technical Details

### New Function: `resolveAgentMention()`

```typescript
function resolveAgentMention(
  text: string,
  entities?: TelegramMessageEntity[],
  config?: OpenClawConfig,
): string | null {
  // 1. Extract all @mentions from entities
  // 2. For each agent in config.agents.list
  // 3. Check if any mention matches agent.groupChat.mentionPatterns
  // 4. Return first matching agentId
}
```

### Routing Priority

1. **Explicit @mention** (e.g., `@planner`) → Route to Planner
2. **Binding match** (e.g., group ID, channel) → Route to bound agent
3. **Default agent** → Route to Commander

### File Changes

| File                                  | Change                                    |
| ------------------------------------- | ----------------------------------------- |
| `src/routing/resolve-route.ts`        | Add mention detection logic               |
| `src/routing/resolve-route.test.ts`   | Add tests                                 |
| `src/telegram/bot-message-context.ts` | Pass message to routing                   |
| `src/telegram/bot/helpers.ts`         | (optional) Helper for extracting mentions |

---

## Acceptance Criteria

- [ ] `@planner hello` in Telegram → Planner responds with 📋 Planner prefix
- [ ] `@engineer code` → Engineer responds with 🔧 Engineer prefix
- [ ] `hello` (no @mention) → Commander responds (default)
- [ ] Unknown @mention (e.g., `@unknown`) → Commander responds (no routing match)
- [ ] Unit tests pass

---

## Notes

- This implementation is specific to Telegram but follows a pattern that could be extended to other channels
- The mention detection uses Telegram's `entities` array which provides exact positions of @mentions
- Case-insensitive matching for mentions

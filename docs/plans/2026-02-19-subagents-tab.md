# SubAgents Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a new "SubAgents" tab in the OpenClaw dashboard UI to view and manage subagent runs.

**Architecture:** Create a new tab following the existing pattern of "Sessions" tab - server method for data, controller for state management, view component for rendering, integrated into the main app with polling support.

**Tech Stack:** TypeScript, Lit (web components), Gateway WebSocket API

---

## Files to Modify

### 1. Navigation (ui/src/ui/navigation.ts)

- Add "subagents" to TAB_GROUPS (group "control")
- Add "subagents" to type Tab
- Add route and icon in TAB_PATHS and iconForTab

### 2. Server Handler (src/gateway/server-methods/)

- Create: `src/gateway/server-methods/subagents.ts` - new handler file
- Modify: `src/gateway/server-methods.ts` - import handler, add to handlers map, add "subagents.list" to READ_METHODS

### 3. Backend Registry (src/agents/subagent-registry.ts)

- Add: Export function `listAllSubagentRuns()` to return all subagent runs

### 4. UI Types (ui/src/ui/types.ts)

- Add: `SubagentRunRecord` type (mirroring backend)
- Add: `SubagentsListResult` type

### 5. Controller (ui/src/ui/controllers/)

- Create: `ui/src/ui/controllers/subagents.ts` - loadSubagents function, state management

### 6. View (ui/src/ui/views/)

- Create: `ui/src/ui/views/subagents.ts` - renderSubagents component with table and filters

### 7. App Integration (ui/src/ui/)

- Modify: `ui/src/ui/app.ts` - add state properties for subagents
- Modify: `ui/src/ui/app-view-state.ts` - add type definitions
- Modify: `ui/src/ui/app-render.ts` - add render logic for subagents tab
- Modify: `ui/src/ui/app-gateway.ts` - call loadSubagents on connect/refresh
- Modify: `ui/src/ui/app-polling.ts` - add polling for subagents
- Modify: `ui/src/ui/app-lifecycle.ts` - start/stop polling on tab change

### 8. Internationalization (ui/src/i18n/locales/)

- Modify: `en.ts` - add tabs.subagents and subtitles.subagents
- Modify: `pt-BR.ts`, `zh-CN.ts`, `zh-TW.ts` - add translations

---

## Task Breakdown

### Task 1: Add "subagents" to Navigation

**Files:**

- Modify: `ui/src/ui/navigation.ts`

**Step 1: Add subagents to TAB_GROUPS**

```typescript
// In TAB_GROUPS, add "subagents" to control group
{
  label: "control",
  tabs: ["overview", "channels", "instances", "sessions", "subagents", "usage", "cron"],
},
```

**Step 2: Add subagents to Tab type**

```typescript
export type Tab =
  | "agents"
  | "overview"
  // ... existing tabs
  | "subagents" // ADD THIS
  | "usage"
  | "cron";
```

**Step 3: Add route and icon**

```typescript
const TAB_PATHS: Record<Tab, string> = {
  // ... existing
  subagents: "/subagents",
};

export function iconForTab(tab: Tab): IconName {
  switch (tab) {
    // ... existing
    case "subagents":
      return "layers"; // or another appropriate icon
    default:
      return "folder";
  }
}
```

---

### Task 2: Add listAllSubagentRuns to Registry

**Files:**

- Modify: `src/agents/subagent-registry.ts`

**Step 1: Add export function**

```typescript
export function listAllSubagentRuns(): SubagentRunRecord[] {
  return [...getRunsSnapshotForRead().values()];
}
```

---

### Task 3: Create Server Method Handler

**Files:**

- Create: `src/gateway/server-methods/subagents.ts`
- Modify: `src/gateway/server-methods.ts`

**Step 1: Create handler file**

```typescript
import { listAllSubagentRuns } from "../../agents/subagent-registry.js";
import type { GatewayRequestHandlers } from "./types.js";

export const subagentsHandlers: GatewayRequestHandlers = {
  "subagents.list": ({ respond }) => {
    const runs = listAllSubagentRuns();
    respond(
      true,
      {
        ts: Date.now(),
        count: runs.length,
        runs: runs,
      },
      undefined,
    );
  },
};
```

**Step 2: Import and register in server-methods.ts**

```typescript
// Add import
import { subagentsHandlers } from "./server-methods/subagents.js";

// Add to handlers map (after sessionsHandlers)
const ALL_HANDLERS = [
  sessionsHandlers,
  subagentsHandlers, // ADD THIS
  // ... merge handlers
];

// Add to READ_METHODS
const READ_METHODS = new Set([
  // ... existing
  "subagents.list", // ADD THIS
]);
```

---

### Task 4: Add UI Types

**Files:**

- Modify: `ui/src/ui/types.ts`

**Step 1: Add types**

```typescript
export type SubagentRunRecord = {
  runId: string;
  childSessionKey: string;
  requesterSessionKey: string;
  requesterOrigin?: unknown;
  requesterDisplayKey: string;
  task: string;
  cleanup: "delete" | "keep";
  label?: string;
  model?: string;
  runTimeoutSeconds?: number;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  outcome?: {
    status: "ok" | "error" | "timeout";
    error?: string;
  };
};

export type SubagentsListResult = {
  ts: number;
  count: number;
  runs: SubagentRunRecord[];
};
```

---

### Task 5: Create Controller

**Files:**

- Create: `ui/src/ui/controllers/subagents.ts`

**Step 1: Create controller**

```typescript
import type { GatewayBrowserClient } from "../gateway.ts";
import type { SubagentsListResult } from "../types.ts";

export type SubagentsState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  subagentsLoading: boolean;
  subagentsResult: SubagentsListResult | null;
  subagentsError: string | null;
  subagentsFilter: "all" | "running" | "completed" | "failed";
};

export async function loadSubagents(
  state: SubagentsState,
  filter?: "all" | "running" | "completed" | "failed",
) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.subagentsLoading) {
    return;
  }
  state.subagentsLoading = true;
  state.subagentsError = null;
  try {
    const filterParam = filter ?? state.subagentsFilter;
    const res = await state.client.request<SubagentsListResult | undefined>("subagents.list", {
      filter: filterParam,
    });
    if (res) {
      state.subagentsResult = res;
    }
  } catch (err) {
    state.subagentsError = String(err);
  } finally {
    state.subagentsLoading = false;
  }
}
```

---

### Task 6: Create View Component

**Files:**

- Create: `ui/src/ui/views/subagents.ts`

**Step 1: Create view component**

```typescript
import { html, nothing } from "lit";
import { formatRelativeTimestamp } from "../format.ts";
import type { SubagentsListResult, SubagentRunRecord } from "../types.ts";

export type SubagentsProps = {
  loading: boolean;
  result: SubagentsListResult | null;
  error: string | null;
  filter: "all" | "running" | "completed" | "failed";
  onFilterChange: (filter: "all" | "running" | "completed" | "failed") => void;
  onRefresh: () => void;
};

export function renderSubagents(props: SubagentsProps) {
  const rows = props.result?.runs ?? [];

  // Filter rows based on filter prop
  const filteredRows = rows.filter((row) => {
    if (props.filter === "all") return true;
    if (props.filter === "running") return !row.endedAt;
    if (props.filter === "completed") return row.endedAt && row.outcome?.status === "ok";
    if (props.filter === "failed") return row.endedAt && row.outcome?.status !== "ok";
    return true;
  });

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">SubAgents</div>
          <div class="card-sub">Active subagent runs and their status.</div>
        </div>
        <button class="btn" ?disabled=${props.loading} @click=${props.onRefresh}>
          ${props.loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div class="filters" style="margin-top: 14px;">
        <label class="field">
          <span>Filter</span>
          <select
            .value=${props.filter}
            @change=${(e: Event) =>
              props.onFilterChange((e.target as HTMLSelectElement).value as any)}
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </label>
      </div>

      ${props.error
        ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
        : nothing}

      <div class="table" style="margin-top: 16px;">
        <div class="table-head">
          <div>Task</div>
          <div>Status</div>
          <div>Runtime</div>
          <div>Model</div>
          <div>Created</div>
        </div>
        ${filteredRows.length === 0
          ? html`<div class="muted">No subagents found.</div>`
          : filteredRows.map((row) => renderRow(row))}
      </div>
    </section>
  `;
}

function renderRow(row: SubagentRunRecord) {
  const status = row.endedAt ? (row.outcome?.status === "ok" ? "completed" : "failed") : "running";

  const runtime =
    row.startedAt && row.endedAt
      ? formatRelativeTimestamp(row.startedAt) + " - " + formatRelativeTimestamp(row.endedAt)
      : row.startedAt
        ? formatRelativeTimestamp(row.startedAt) + " (ongoing)"
        : "pending";

  const taskPreview = row.task.length > 50 ? row.task.substring(0, 50) + "..." : row.task;

  return html`
    <div class="table-row">
      <div class="mono" title="${row.task}">${taskPreview}</div>
      <div>
        <span class="badge ${status}">${status}</span>
      </div>
      <div>${runtime}</div>
      <div>${row.model ?? "default"}</div>
      <div>${formatRelativeTimestamp(row.createdAt)}</div>
    </div>
  `;
}
```

---

### Task 7: Integrate into App

**Files:**

- Modify: `ui/src/ui/app.ts`
- Modify: `ui/src/ui/app-view-state.ts`
- Modify: `ui/src/ui/app-render.ts`
- Modify: `ui/src/ui/app-gateway.ts`
- Modify: `ui/src/ui/app-polling.ts`
- Modify: `ui/src/ui/app-lifecycle.ts`

**Step 1: Add state in app.ts**

```typescript
@state() subagentsLoading = false;
@state() subagentsResult: SubagentsListResult | null = null;
@state() subagentsError: string | null = null;
@state() subagentsFilter: "all" | "running" | "completed" | "failed" = "all";
```

**Step 2: Add type in app-view-state.ts**

```typescript
subagentsLoading: boolean;
subagentsResult: SubagentsListResult | null;
subagentsError: string | null;
subagentsFilter: "all" | "running" | "completed" | "failed";
```

**Step 3: Add render in app-render.ts**

```typescript
import { renderSubagents } from "./views/subagents.ts";
import { loadSubagents } from "./controllers/subagents.ts";

// In render function, add:
${
  state.tab === "subagents"
    ? renderSubagents({
        loading: state.subagentsLoading,
        result: state.subagentsResult,
        error: state.subagentsError,
        filter: state.subagentsFilter,
        onFilterChange: (filter) => {
          state.subagentsFilter = filter;
          loadSubagents(state, filter);
        },
        onRefresh: () => loadSubagents(state),
      })
    : nothing
}
```

**Step 4: Add gateway handler in app-gateway.ts**

```typescript
// On connect and periodically
if (state.connected && state.tab === "subagents") {
  loadSubagents(state);
}
```

**Step 5: Add polling in app-polling.ts**

```typescript
export function startSubagentsPolling(host: PollingHost) {
  // Similar pattern to other polling functions
}

export function stopSubagentsPolling(host: PollingHost) {
  // Similar pattern to other polling functions
}
```

**Step 6: Update lifecycle in app-lifecycle.ts**

```typescript
// Import and start/stop polling when tab changes
```

---

### Task 8: Add Internationalization

**Files:**

- Modify: `ui/src/i18n/locales/en.ts`
- Modify: `ui/src/i18n/locales/pt-BR.ts`
- Modify: `ui/src/i18n/locales/zh-CN.ts`
- Modify: `ui/src/i18n/locales/zh-TW.ts`

**Step 1: Add to en.ts**

```typescript
tabs: {
  // ... existing
  subagents: "SubAgents",
},
subtitles: {
  // ... existing
  subagents: "Monitor and manage subagent runs.",
},
```

---

## Verification

After implementation, verify:

1. UI builds without errors: `pnpm ui:build`
2. Full build passes: `pnpm build`
3. Tab appears in navigation
4. Data loads from API
5. Filters work correctly
6. Polling updates data

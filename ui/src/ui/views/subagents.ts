import { html, nothing } from "lit";
import { t } from "../../i18n/index.ts";

export interface SubagentInfo {
  id: string;
  key: string;
  label?: string;
  displayName?: string;
  task?: string;
  status: "running" | "completed" | "failed";
  startedAt: number;
  endedAt?: number;
  runtime?: number;
  spawnedBy?: string;
  spawnDepth?: number;
}

export interface SubagentsTabProps {
  loading: boolean;
  subagents: SubagentInfo[];
  error: string | null;
  filter: "all" | "running" | "completed" | "failed";
  onRefresh: () => void;
  onFilterChange: (filter: "all" | "running" | "completed" | "failed") => void;
}

function formatRuntime(startedAt: number, endedAt?: number): string {
  const end = endedAt ?? Date.now();
  const diffMs = end - startedAt;

  if (diffMs < 1000) {
    return `${diffMs}ms`;
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getStatusColor(status: string): string {
  switch (status) {
    case "running":
      return "#3b82f6"; // blue
    case "completed":
      return "#22c55e"; // green
    case "failed":
      return "#ef4444"; // red
    default:
      return "#64748b"; // gray
  }
}

function renderStatusBadge(status: string) {
  const color = getStatusColor(status);
  return html`
    <span style="
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      background: ${color}20;
      color: ${color};
    ">
      <span style="
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${color};
        ${status === "running" ? "animation: pulse 1s infinite;" : ""}
      "></span>
      ${status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  `;
}

function renderFilterButton(
  filter: "all" | "running" | "completed" | "failed",
  currentFilter: "all" | "running" | "completed" | "failed",
  onFilterChange: (filter: "all" | "running" | "completed" | "failed") => void,
) {
  const isActive = filter === currentFilter;
  return html`
    <button
      class="filter-btn ${isActive ? "active" : ""}"
      @click=${() => onFilterChange(filter)}
      style="
        background: ${isActive ? "#1e293b" : "transparent"};
        border: 1px solid ${isActive ? "#6366f1" : "#334155"};
        color: ${isActive ? "#e2e8f0" : "#64748b"};
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 150ms ease;
      "
    >
      ${
        filter === "all"
          ? t("subagents.filterAll")
          : filter === "running"
            ? t("subagents.filterRunning")
            : filter === "completed"
              ? t("subagents.filterCompleted")
              : t("subagents.filterFailed")
      }
    </button>
  `;
}

function renderSubagentCard(subagent: SubagentInfo) {
  return html`
    <div style="
      background: #1e293b;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 8px;
      border: 1px solid #334155;
    ">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div>
          <div style="font-weight: 600; color: #e2e8f0; margin-bottom: 4px;">
            ${subagent.displayName || subagent.label || subagent.key}
          </div>
          <div style="font-size: 12px; color: #64748b; font-family: monospace;">
            ${subagent.key}
          </div>
        </div>
        ${renderStatusBadge(subagent.status)}
      </div>
      
      ${
        subagent.task
          ? html`
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px; text-transform: uppercase;">
            ${t("subagents.task")}
          </div>
          <div style="
            background: #0f172a;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 13px;
            color: #94a3b8;
            max-height: 80px;
            overflow-y: auto;
          ">
            ${subagent.task}
          </div>
        </div>
      `
          : nothing
      }
      
      <div style="display: flex; gap: 24px; font-size: 12px; color: #64748b;">
        <div>
          <span style="color: #94a3b8;">${t("subagents.startedAt")}:</span>
          ${formatTimestamp(subagent.startedAt)}
        </div>
        ${
          subagent.runtime
            ? html`
          <div>
            <span style="color: #94a3b8;">${t("subagents.runtime")}:</span>
            ${formatRuntime(subagent.startedAt, subagent.endedAt)}
          </div>
        `
            : nothing
        }
        ${
          subagent.spawnedBy
            ? html`
          <div>
            <span style="color: #94a3b8;">${t("subagents.spawnedBy")}:</span>
            ${subagent.spawnedBy}
          </div>
        `
            : nothing
        }
        ${
          subagent.spawnDepth !== undefined
            ? html`
          <div>
            <span style="color: #94a3b8;">${t("subagents.depth")}:</span>
            ${subagent.spawnDepth}
          </div>
        `
            : nothing
        }
      </div>
    </div>
  `;
}

export function renderSubagents(props: SubagentsTabProps) {
  const filteredSubagents = props.subagents.filter((subagent) => {
    if (props.filter === "all") {
      return true;
    }
    return subagent.status === props.filter;
  });

  return html`
    <section class="card">
      <!-- Header -->
      <div class="row" style="justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div>
          <div class="card-title">${t("tabs.subagents")}</div>
          <div class="card-sub">${t("subagents.subtitle")}</div>
        </div>
        <div class="row" style="align-items: center; gap: 16px;">
          <div style="font-size: 12px; color: #64748b;">
            ${
              props.loading
                ? t("common.refresh") + "..."
                : `${filteredSubagents.length} ${t("subagents.count")}`
            }
          </div>
          <button 
            class="btn" 
            ?disabled=${props.loading}
            @click=${props.onRefresh}
            style="
              background: #6366f1;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
            "
          >
            ${props.loading ? t("common.refresh") + "..." : t("common.refresh")}
          </button>
        </div>
      </div>
      
      <!-- Error -->
      ${
        props.error
          ? html`
        <div class="callout danger" style="margin-bottom: 16px;">
          ${props.error}
        </div>
      `
          : nothing
      }
      
      <!-- Filters -->
      <div class="row" style="gap: 8px; margin-bottom: 16px;">
        ${renderFilterButton("all", props.filter, props.onFilterChange)}
        ${renderFilterButton("running", props.filter, props.onFilterChange)}
        ${renderFilterButton("completed", props.filter, props.onFilterChange)}
        ${renderFilterButton("failed", props.filter, props.onFilterChange)}
      </div>
      
      <!-- Content -->
      <div style="
        background: #0f172a;
        border-radius: 8px;
        padding: 16px;
        min-height: 300px;
        max-height: 500px;
        overflow-y: auto;
      ">
        ${
          props.loading && props.subagents.length === 0
            ? html`
          <div style="text-align: center; padding: 48px; color: #64748b;">
            <div style="font-size: 32px; margin-bottom: 12px;">⏳</div>
            <div>${t("subagents.loading")}</div>
          </div>
        `
            : filteredSubagents.length === 0
              ? html`
          <div style="text-align: center; padding: 48px; color: #64748b;">
            <div style="font-size: 32px; margin-bottom: 12px;">🔍</div>
            <div>${
              props.filter === "all"
                ? t("subagents.empty")
                : t("subagents.emptyFiltered").replace("{status}", props.filter)
            }</div>
          </div>
        `
              : html`
          <div class="subagent-list">
            ${filteredSubagents.map((subagent) => renderSubagentCard(subagent))}
          </div>
        `
        }
      </div>
      
      <!-- Footer -->
      <div class="row" style="justify-content: space-between; margin-top: 16px; font-size: 12px; color: #64748b;">
        <span>${t("subagents.total")}: ${props.subagents.length}</span>
        <span>${t("subagents.polling")}</span>
      </div>
      
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>
    </section>
  `;
}

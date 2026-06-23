import type { PlanResume } from '@mastra/client-js';
import { useState } from 'react';

import { BellIcon, BrainIcon, ChevronIcon, CopyIcon, FolderIcon, LogoMark, TargetIcon, ToolIcon } from './icons';
import { Markdown } from './Markdown';

import type {
  ApprovalPrompt,
  AssistantEntry,
  GoalSnapshot,
  NoticeEntry,
  NotificationEntry,
  NotificationSummaryEntry,
  SubagentEntry,
  SuspensionPrompt,
  TimelineEntry,
  ToolCall,
  UserEntry,
  OMPhase,
  UsageSnapshot,
} from './transcript';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function stringify(v: unknown): string {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function lastSegment(id: string): string {
  const parts = id.split('/');
  return parts[parts.length - 1] ?? id;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy-btn"
      title="Copy"
      aria-label="Copy"
      onClick={e => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <span className="copy-ok">Copied</span> : <CopyIcon />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tool card (collapsible)
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<ToolCall['status'], string> = {
  running: 'Running',
  done: 'Done',
  error: 'Failed',
};

function ToolCard({ tool }: { tool: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const argsPreview = tool.args !== undefined ? JSON.stringify(tool.args) : tool.argsText;
  const argsPretty = tool.args !== undefined ? stringify(tool.args) : tool.argsText;
  const resultText = tool.status !== 'running' && tool.result !== undefined ? stringify(tool.result) : undefined;

  return (
    <div className={`tool-card ${tool.status}`}>
      <button type="button" className="tool-head" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        <span className="tool-icon"><ToolIcon name={tool.toolName} /></span>
        <span className="tool-name">{tool.toolName}</span>
        {argsPreview && !expanded && <span className="tool-args-preview">{truncate(argsPreview, 72)}</span>}
        <span className={`tool-status-label ${tool.status}`}>{STATUS_LABEL[tool.status]}</span>
        <span className={`tool-status ${tool.status}`} title={STATUS_LABEL[tool.status]} />
        <ChevronIcon size={13} className={`tool-chevron ${expanded ? 'open' : ''}`} />
      </button>
      {expanded && (
        <div className="tool-body">
          {argsPretty && (
            <div className="tool-section">
              <div className="tool-section-head"><span>Arguments</span><CopyButton text={argsPretty} /></div>
              <pre className="result-block">{argsPretty}</pre>
            </div>
          )}
          {tool.output && (
            <div className="tool-section">
              <div className="tool-section-head"><span>Output</span><CopyButton text={tool.output} /></div>
              <pre className="shell-output">{tool.output}</pre>
            </div>
          )}
          {resultText !== undefined && (
            <div className="tool-section">
              <div className="tool-section-head"><span>Result</span><CopyButton text={resultText} /></div>
              <pre className="result-block">{truncate(resultText, 800)}</pre>
            </div>
          )}
        </div>
      )}
      {!expanded && tool.output && (
        <div className="tool-body">
          <pre className="shell-output collapsed-output">{truncate(tool.output, 180)}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approval prompt (tool_approval_required)
// ---------------------------------------------------------------------------

function ApprovalCard({
  prompt,
  onApprove,
}: {
  prompt: ApprovalPrompt;
  onApprove: (toolCallId: string, approved: boolean, promptId: string) => void;
}) {
  return (
    <div className="prompt-card approval">
      <div className="prompt-title">
        Approve <code>{prompt.toolName}</code>?
      </div>
      <pre className="result-block">{truncate(stringify(prompt.args), 400)}</pre>
      <div className="prompt-actions">
        <button className="btn btn-primary btn-sm" onClick={() => onApprove(prompt.toolCallId, true, prompt.id)}>
          Approve
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => onApprove(prompt.toolCallId, false, prompt.id)}>
          Decline
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suspension prompt (ask_user / request_access / submit_plan)
// ---------------------------------------------------------------------------

interface SuspendPayloadShape {
  question?: string;
  options?: { label: string; description?: string }[];
  requestedPath?: string;
  reason?: string;
  plan?: { title?: string; summary?: string };
  title?: string;
}

function SuspensionCard({
  prompt,
  onRespond,
}: {
  prompt: SuspensionPrompt;
  onRespond: (toolCallId: string, resumeData: string | string[] | PlanResume, promptId: string) => void;
}) {
  const payload = (prompt.suspendPayload ?? {}) as SuspendPayloadShape;

  if (prompt.toolName === 'submit_plan') {
    return (
      <div className="prompt-card suspension">
        <div className="prompt-title">Plan: {payload.plan?.title ?? payload.title ?? 'Proposed plan'}</div>
        {payload.plan?.summary && <div className="text">{payload.plan.summary}</div>}
        <div className="prompt-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onRespond(prompt.toolCallId, { action: 'approved' }, prompt.id)}>
            Approve &amp; build
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onRespond(prompt.toolCallId, { action: 'rejected' }, prompt.id)}>
            Reject
          </button>
        </div>
      </div>
    );
  }

  if (prompt.toolName === 'request_access') {
    return (
      <div className="prompt-card suspension">
        <div className="prompt-title">Grant access to {payload.requestedPath ?? 'a path'}?</div>
        {payload.reason && <div style={{ color: 'var(--fg-dim)', fontSize: 12 }}>Reason: {payload.reason}</div>}
        <div className="prompt-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onRespond(prompt.toolCallId, 'Yes', prompt.id)}>
            Allow
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onRespond(prompt.toolCallId, 'No', prompt.id)}>
            Deny
          </button>
        </div>
      </div>
    );
  }

  return <AskUserCard prompt={prompt} payload={payload} onRespond={onRespond} />;
}

function AskUserCard({
  prompt,
  payload,
  onRespond,
}: {
  prompt: SuspensionPrompt;
  payload: SuspendPayloadShape;
  onRespond: (toolCallId: string, resumeData: string | string[], promptId: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const options = payload.options ?? [];
  return (
    <div className="prompt-card suspension">
      <div className="prompt-title">{payload.question ?? 'The agent has a question'}</div>
      {options.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {options.map(opt => (
            <button key={opt.label} className="prompt-option" onClick={() => onRespond(prompt.toolCallId, opt.label, prompt.id)}>
              <strong>{opt.label}</strong>
              {opt.description && <span style={{ color: 'var(--fg-dim)' }}> — {opt.description}</span>}
            </button>
          ))}
        </div>
      ) : (
        <form
          style={{ display: 'flex', gap: 8, marginTop: 6 }}
          onSubmit={e => {
            e.preventDefault();
            if (draft.trim()) onRespond(prompt.toolCallId, draft.trim(), prompt.id);
          }}
        >
          <input className="input" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Your answer…" autoFocus />
          <button className="btn btn-primary btn-sm" type="submit">Reply</button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subagent card
// ---------------------------------------------------------------------------

function SubagentCard({ entry }: { entry: SubagentEntry }) {
  return (
    <div className="subagent-card">
      <div className="tool-head">
        <span className={`tool-status ${entry.done ? 'done' : 'running'}`} />
        <span className="tool-name">subagent: {entry.agentType}</span>
        <span style={{ color: 'var(--fg-dim)', fontSize: 11 }}>{lastSegment(entry.modelId)}</span>
      </div>
      <div className="text" style={{ padding: '4px 0' }}>{entry.task}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification cards
// ---------------------------------------------------------------------------

function NotificationCard({ entry }: { entry: NotificationEntry }) {
  return (
    <div className="notif-card">
      <div className="notif-head">
        <span className="notif-icon"><BellIcon size={13} /></span>
        <span className="tool-name">{entry.source ?? 'notification'}</span>
        {entry.priority && <span className={`notif-priority prio-${entry.priority}`}>{entry.priority}</span>}
      </div>
      <div className="notif-message">{entry.message}</div>
    </div>
  );
}

function NotificationSummaryCard({ entry }: { entry: NotificationSummaryEntry }) {
  return (
    <div className="notif-card">
      <div className="notif-head">
        <span className="notif-icon"><BellIcon size={13} /></span>
        <span className="tool-name">Notification summary</span>
        <span className="notif-count">{entry.pending} pending</span>
      </div>
      <div className="notif-message">{entry.message}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transcript
// ---------------------------------------------------------------------------

export function Transcript({
  entries,
  onApprove,
  onRespond,
}: {
  entries: TimelineEntry[];
  onApprove: (toolCallId: string, approved: boolean, promptId: string) => void;
  onRespond: (toolCallId: string, resumeData: string | string[] | PlanResume, promptId: string) => void;
}) {
  return (
    <>
      {entries.map(entry => {
        switch (entry.kind) {
          case 'user':
            return <UserBubble key={entry.id} entry={entry} />;
          case 'assistant':
            return <AssistantBubble key={entry.id} entry={entry} />;
          case 'notice':
            return <Notice key={entry.id} entry={entry} />;
          case 'approval':
            return <ApprovalCard key={entry.id} prompt={entry} onApprove={onApprove} />;
          case 'notification':
            return <NotificationCard key={entry.id} entry={entry} />;
          case 'notification_summary':
            return <NotificationSummaryCard key={entry.id} entry={entry} />;
          case 'suspension':
            return <SuspensionCard key={entry.id} prompt={entry} onRespond={onRespond} />;
          case 'subagent':
            return <SubagentCard key={entry.id} entry={entry} />;
          default:
            return null;
        }
      })}
    </>
  );
}

function UserBubble({ entry }: { entry: UserEntry }) {
  return (
    <div className="msg msg-user">
      <div className="msg-head">
        <span className={`msg-role ${entry.steer ? 'role-steer' : ''}`}>{entry.steer ? 'Steer' : 'You'}</span>
      </div>
      <div className="bubble bubble-user">
        <div className="text">{entry.text}</div>
      </div>
    </div>
  );
}

function AssistantBubble({ entry }: { entry: AssistantEntry }) {
  if (!entry.text && entry.tools.length === 0) return null;
  return (
    <div className="msg msg-assistant">
      <div className="msg-head">
        <span className="msg-avatar"><LogoMark size={14} /></span>
        <span className="msg-role">Agent</span>
      </div>
      <div className="bubble bubble-assistant">
        {entry.text && (
          <div className="prose">
            <Markdown>{entry.text}</Markdown>
            {entry.streaming && <span className="streaming-cursor" />}
          </div>
        )}
        {entry.tools.map(t => (
          <ToolCard key={t.toolCallId} tool={t} />
        ))}
      </div>
    </div>
  );
}

function Notice({ entry }: { entry: NoticeEntry }) {
  return <div className={`notice ${entry.level === 'error' ? 'error' : ''}`}>{entry.text}</div>;
}

// ---------------------------------------------------------------------------
// Status line
// ---------------------------------------------------------------------------

export function StatusLine({
  status,
  modeId,
  modelId,
  running,
  followUpCount,
  omPhase,
  usage,
  workspaceReady,
  projectName,
}: {
  status: string;
  modeId?: string;
  modelId?: string;
  running: boolean;
  followUpCount?: number;
  omPhase?: OMPhase;
  usage?: UsageSnapshot;
  workspaceReady?: boolean;
  projectName?: string;
}) {
  return (
    <div className="status-line">
      <span className="badge badge-mode">{modeId ?? '—'}</span>
      <span className="status-model">{modelId ? lastSegment(modelId) : 'no model'}</span>
      {projectName && (
        <span className="status-item"><FolderIcon size={13} /> {projectName}</span>
      )}
      {!projectName && workspaceReady !== undefined && (
        <span className="status-item"><FolderIcon size={13} /> {workspaceReady ? 'workspace' : 'no workspace'}</span>
      )}
      {omPhase && omPhase !== 'idle' && (
        <span className="status-item"><BrainIcon size={13} /> {omPhase}</span>
      )}
      {(followUpCount ?? 0) > 0 && <span className="status-item">{followUpCount} queued</span>}
      {usage?.totalTokens != null && (
        <span className="status-item">{(usage.totalTokens / 1000).toFixed(1)}k tokens</span>
      )}
      <span style={{ flex: 1 }} />
      <span className={`connection-dot ${status}`} />
      <span className="status-state">{running ? 'working…' : status === 'reconnecting' ? 'reconnecting…' : status}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Goal panel
// ---------------------------------------------------------------------------

export function GoalPanel({
  goal,
  onSetGoal,
  onPauseGoal,
  onResumeGoal,
  onClearGoal,
}: {
  goal?: GoalSnapshot;
  onSetGoal: (objective: string) => void;
  onPauseGoal: () => void;
  onResumeGoal: () => void;
  onClearGoal: () => void;
}) {
  const [draft, setDraft] = useState('');

  if (!goal) {
    return (
      <form
        className="goal-bar"
        onSubmit={e => {
          e.preventDefault();
          if (draft.trim()) {
            onSetGoal(draft.trim());
            setDraft('');
          }
        }}
      >
        <input
          className="input"
          style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Set a goal objective…"
        />
        <button className="btn btn-primary btn-sm" type="submit">Set Goal</button>
      </form>
    );
  }

  const progress = `${goal.iteration}/${goal.maxRuns}`;

  return (
    <div className={`goal-bar goal-${goal.status}`}>
      <span className="goal-icon"><TargetIcon size={15} /></span>
      <span className="goal-objective">{goal.objective}</span>
      <span className="goal-progress">{progress}</span>
      {goal.reason && (
        <span style={{ color: 'var(--fg-dim)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {goal.reason}
        </span>
      )}
      {goal.status === 'active' && (
        <button className="btn btn-danger btn-sm" onClick={onPauseGoal}>Pause</button>
      )}
      {goal.status === 'paused' && (
        <button className="btn btn-primary btn-sm" onClick={onResumeGoal}>Resume</button>
      )}
      <button className="btn btn-sm" onClick={onClearGoal}>Clear</button>
    </div>
  );
}

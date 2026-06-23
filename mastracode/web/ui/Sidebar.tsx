import type { HarnessThreadInfo } from '@mastra/client-js';
import { useState } from 'react';

import { DirectoryPicker } from './DirectoryPicker';
import { CloseIcon, LogoMark, PlusIcon } from './icons';
import type { Project } from './projects';
import { addProject, loadProjects, removeProject } from './projects';

const MAX_THREADS = 5;

/** Compact relative time, e.g. "just now", "5m", "3h", "2d", or a date. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (project: Project | null) => void;
  onProjectsChange: (projects: Project[]) => void;
  threads: HarnessThreadInfo[];
  activeThreadId?: string;
  onSwitchThread: (threadId: string) => void;
  onCreateThread: (title?: string) => void;
  onDeleteThread: (threadId: string) => void;
}

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onProjectsChange,
  threads,
  activeThreadId,
  onSwitchThread,
  onCreateThread,
  onDeleteThread,
}: SidebarProps) {
  const [showPicker, setShowPicker] = useState(false);

  // ── Project handlers ──────────────────────────────────────────────────

  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handlePickFolder = async (path: string, name: string) => {
    setAdding(true);
    setAddError(null);
    try {
      // addProject resolves the server-side (TUI-matching) resourceId, then
      // persists. Reload from storage so we don't double-append.
      const project = await addProject(name || path, path);
      setShowPicker(false);
      onProjectsChange(loadProjects());
      onSelectProject(project);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeProject(id);
    onProjectsChange(projects.filter(p => p.id !== id));
    if (activeProjectId === id) onSelectProject(null);
  };

  // ── Threads: sorted by most recent, limited to 5 ─────────────────────

  const sortedThreads = [...threads]
    .sort((a, b) => {
      const ta = a.updatedAt ?? a.createdAt ?? '';
      const tb = b.updatedAt ?? b.createdAt ?? '';
      return tb.localeCompare(ta);
    })
    .slice(0, MAX_THREADS);

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="sidebar">
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <div className="sidebar-brand">
        <LogoMark size={22} className="logo-mark" />
        <span className="sidebar-brand-name">MastraCode</span>
      </div>

      {/* ── Projects ──────────────────────────────────────────────────── */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">
            Projects {projects.length > 0 && <span className="sidebar-count">{projects.length}</span>}
          </span>
          <div className="sidebar-section-actions">
            <button className="sidebar-icon-btn" title="Add project" aria-label="Add project" onClick={() => setShowPicker(true)}>
              <PlusIcon size={15} />
            </button>
          </div>
        </div>

        <div className="sidebar-project-list">
          {projects.map(p => (
            <button
              key={p.id}
              className={`sidebar-project ${p.id === activeProjectId ? 'active' : ''}`}
              onClick={() => onSelectProject(p)}
              title={p.path}
            >
              <span className="sidebar-project-name">{p.name}</span>
              <span className="sidebar-project-path">{p.path}</span>
              <span className="sidebar-project-remove" onClick={e => handleRemoveProject(e, p.id)} title="Remove"><CloseIcon size={13} /></span>
            </button>
          ))}

          {projects.length === 0 && (
            <div className="sidebar-empty">No projects yet</div>
          )}
        </div>

        {showPicker && (
          <DirectoryPicker
            onPick={(path, name) => void handlePickFolder(path, name)}
            onCancel={() => setShowPicker(false)}
            busy={adding}
            error={addError}
          />
        )}
      </div>

      {/* ── Threads (scoped to active project) ────────────────────────── */}
      {activeProject && (
      <div className="sidebar-section sidebar-section-grow">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">
            Threads {threads.length > 0 && <span className="sidebar-count">{threads.length}</span>}
          </span>
          <button
            className="sidebar-icon-btn"
            title="New thread"
            aria-label="New thread"
            onClick={() => onCreateThread()}
          >
            <PlusIcon size={15} />
          </button>
        </div>

        <div className="sidebar-list">
          {sortedThreads.length === 0 && (
            <div className="sidebar-empty">No threads yet</div>
          )}
          {sortedThreads.map(t => (
            <button
              key={t.id}
              className={`sidebar-thread ${t.id === activeThreadId ? 'active' : ''}`}
              onClick={() => onSwitchThread(t.id)}
            >
              <span className={`sidebar-thread-title ${t.title ? '' : 'untitled'}`}>
                {t.title || 'Untitled'}
              </span>
              {t.updatedAt && (
                <span className="sidebar-thread-date">{relativeTime(t.updatedAt)}</span>
              )}
              <span
                className="sidebar-thread-remove"
                onClick={e => { e.stopPropagation(); onDeleteThread(t.id); }}
                title="Delete"
              >
                <CloseIcon size={13} />
              </span>
            </button>
          ))}
          {threads.length > MAX_THREADS && (
            <div className="sidebar-overflow">+{threads.length - MAX_THREADS} more</div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

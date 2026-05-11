import { useState } from 'react';
import {
  CheckCircle, XCircle, Loader, ChevronDown, ChevronUp,
  RotateCcw, X, Trash2,
} from 'lucide-react';

function StatusIcon({ status, progress }) {
  if (status === 'uploading') {
    return (
      <div className="relative w-4 h-4 flex-shrink-0">
        <svg className="w-4 h-4 -rotate-90" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill="none" stroke="#252836" strokeWidth="2" />
          <circle
            cx="8" cy="8" r="6"
            fill="none"
            stroke="#4F8DFF"
            strokeWidth="2"
            strokeDasharray={`${2 * Math.PI * 6}`}
            strokeDashoffset={`${2 * Math.PI * 6 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-150"
          />
        </svg>
      </div>
    );
  }
  if (status === 'done')    return <CheckCircle size={14} className="text-success flex-shrink-0" />;
  if (status === 'error')   return <XCircle size={14} className="text-error flex-shrink-0" />;
  // pending
  return <div className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" />;
}

export default function UploadQueueTray({ queue, clearDone, retryItem, removeItem, isActive, doneCount, errorCount }) {
  const [collapsed, setCollapsed] = useState(false);

  if (queue.length === 0) return null;

  const pendingCount = queue.filter((i) => i.status === 'pending').length;
  const uploadingItem = queue.find((i) => i.status === 'uploading');

  // Summary label
  let summaryLabel = '';
  if (isActive) {
    summaryLabel = uploadingItem
      ? `Uploading ${uploadingItem.file.name.length > 20 ? uploadingItem.file.name.slice(0, 20) + '…' : uploadingItem.file.name}…`
      : 'Preparing…';
    if (pendingCount > 0) summaryLabel += ` (${pendingCount} waiting)`;
  } else if (errorCount > 0) {
    summaryLabel = `${doneCount} done · ${errorCount} failed`;
  } else {
    summaryLabel = `${doneCount} upload${doneCount !== 1 ? 's' : ''} complete`;
  }

  return (
    <div className="fixed bottom-24 right-4 md:bottom-5 md:right-5 z-40 w-80 bg-surface border border-border rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-slide-up">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-elevated/40 transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-accent/20' : errorCount > 0 ? 'bg-error/10' : 'bg-success/10'}`}>
          {isActive
            ? <Loader size={12} className="text-accent animate-spin" />
            : errorCount > 0
            ? <XCircle size={12} className="text-error" />
            : <CheckCircle size={12} className="text-success" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-text-primary text-xs font-medium truncate">{summaryLabel}</p>
          {isActive && uploadingItem && (
            <div className="mt-1 h-1 bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-150"
                style={{ width: `${uploadingItem.progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isActive && doneCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); clearDone(); }}
              className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
              title="Clear completed"
            >
              <Trash2 size={11} />
            </button>
          )}
          {collapsed ? <ChevronUp size={13} className="text-text-muted" /> : <ChevronDown size={13} className="text-text-muted" />}
        </div>
      </div>

      {/* File list */}
      {!collapsed && (
        <div className="border-t border-border max-h-52 overflow-y-auto">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/50 last:border-0">
              <StatusIcon status={item.status} progress={item.progress} />

              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-xs truncate">{item.file.name}</p>
                {item.status === 'error' && (
                  <p className="text-error text-xs truncate">{item.errorMsg}</p>
                )}
                {item.status === 'uploading' && (
                  <p className="text-text-muted text-xs">{item.progress}%</p>
                )}
                {item.status === 'pending' && (
                  <p className="text-text-muted text-xs">Waiting…</p>
                )}
              </div>

              <div className="flex items-center gap-0.5 flex-shrink-0">
                {item.status === 'error' && (
                  <button
                    onClick={() => retryItem(item.id)}
                    className="p-1 rounded text-text-muted hover:text-accent transition-colors"
                    title="Retry"
                  >
                    <RotateCcw size={11} />
                  </button>
                )}
                {(item.status === 'done' || item.status === 'error') && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                    title="Dismiss"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

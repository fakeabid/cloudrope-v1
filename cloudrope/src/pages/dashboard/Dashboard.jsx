import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { useUploadQueue } from '../../hooks/useUploadQueue';
import { useNavigate } from 'react-router-dom';
import { Link2, X, Settings } from 'lucide-react';
import { MAX_STORAGE_BYTES, formatFileSize } from '../../utils/formatters';
import toast from 'react-hot-toast';
import cloudImg from '../../assets/cloud.png';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(name) {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const first = name?.split(' ')[0]?.toLowerCase() || 'there';
  return `good ${time}, ${first}`;
}

function getCalendarDates() {
  const today = new Date();
  return [-2, -1, 0, 1, 2].map(offset => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return d;
  });
}

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

// ─── Storage Gauge (circular SVG) ────────────────────────────────────────────
function StorageGauge({ usedPercent }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - usedPercent / 100);
  // Angle for the dot at the end of the arc
  const angle = ((usedPercent / 100) * 360 - 90) * (Math.PI / 180);
  const dotX = 60 + radius * Math.cos(angle);
  const dotY = 60 + radius * Math.sin(angle);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Track */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none" stroke="#DBEAFE" strokeWidth="18"
          strokeLinecap="round"
        />
        {/* Progress */}
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="#2563EB"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dashoffset 0.6s ease' }}
        />
        {/* Dot at end of arc */}
        {usedPercent > 2 && (
          <circle cx={dotX} cy={dotY} r="7" fill="#2563EB" />
        )}
        {/* Start dot */}
        <circle cx="60" cy="16" r="7" fill="#2563EB" />
      </svg>
      <p className="font-bold text-3xl text-text-primary">{Math.round(usedPercent)}%</p>
    </div>
  );
}

// ─── Stats Panel ─────────────────────────────────────────────────────────────
function StatsPanel({ activeSharesCount, expiringShares, usedPercent }) {
  const today = new Date();
  const calDates = getCalendarDates();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-3 animate-fade-up h-full">
      {/* Activity header */}
      <div className="bg-surface rounded-2xl shadow-card p-8 h-full flex flex-col">
        <p className="text-sm text-text-muted font-medium mb-5">Activity</p>

        {/* Calendar strip */}
        <div className="bg-elevated rounded-xl p-4 mb-5">
          <p className="text-sm font-medium text-text-primary mb-3">
            {DAY_NAMES[today.getDay()]}, {ordinal(today.getDate())} {MONTH_NAMES[today.getMonth()]}
          </p>
          <div className="flex items-center justify-between">
            {calDates.map((d, i) => {
              const isToday = i === 2;
              const hasExpiry = expiringShares.some(s => {
                const exp = new Date(s.expires_at);
                return exp.toDateString() === d.toDateString();
              });
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  {hasExpiry && !isToday
                    ? <span className="w-1.5 h-1.5 rounded-full bg-error" />
                    : <span className="w-1.5 h-1.5" />
                  }
                  <span className={`font-medium text-base w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                    isToday
                      ? 'text-accent font-bold'
                      : 'text-text-muted'
                  }`}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Expiry warning */}
          <div className="mt-5 flex items-center gap-2 bg-white rounded-lg px-3 py-2">
            {expiringShares.length > 0 ?
              <>
                <span className="w-2 h-2 rounded-full bg-error flex-shrink-0" />
                <p className="text-sm text-text-muted">Shares expiring soon</p>
              </>
              :
              <>
                <span className="w-2 h-2 rounded-full bg-elevated flex-shrink-0" />
                <p className="text-sm text-text-muted">All clear</p>
              </>
            }              
          </div>
        </div>

        {/* Active shares + storage row */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-5">
          {/* Active shares */}
          <button
            onClick={() => navigate('/dashboard/shares')}
            className="flex-1 bg-elevated rounded-xl p-4 text-left hover:shadow-card-hover transition-shadow"
          >
            <p className="text-sm text-text-muted mb-1">Active Shares</p>
            <div className="flex items-center gap-2">
              <p className="font-display font-bold text-3xl text-text-primary">{activeSharesCount}</p>
              <Link2 size={20} className="text-text-primary" />
            </div>
          </button>

          {/* Storage gauge */}
          <div className="flex-1 bg-accent-light rounded-xl p-4 flex flex-col items-center justify-center">
            <StorageGauge usedPercent={usedPercent} />
          </div>
        </div>

        {/* Settings shortcut */}
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="mt-5 w-full bg-elevated rounded-xl px-4 py-5 text-sm font-medium text-text-muted hover:text-text-primary hover:shadow-card-hover transition-all flex items-center gap-2"
        >
          <Settings size={15} />
          Settings
        </button>
      </div>
    </div>
  );
}

// ─── Upload List Panel ────────────────────────────────────────────────────────
function UploadListPanel({ staged, onRemove, onClearAll, onUploadOnly, onShare }) {
  return (
    <div className="bg-surface rounded-2xl shadow-card p-5 animate-fade-up flex flex-col md:h-full" style={{ minHeight: 360 }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-text-primary">Upload List</p>
        {staged.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-error font-medium hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* File list */}
      <div className="flex-1 space-y-2 mb-5">
        {staged.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">No files staged</p>
        )}
        {staged.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 bg-accent-light rounded-xl px-3 py-2.5"
          >
            <p className="flex-1 text-sm text-text-primary truncate">{item.file.name}</p>
            <button
              onClick={() => onRemove(item.id)}
              className="text-error hover:bg-error/10 p-1 rounded transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
        <button
          onClick={onUploadOnly}
          disabled={staged.length === 0}
          className="btn-primary-full"
        >
          Upload Only
        </button>
        <button
          onClick={onShare}
          disabled={staged.length === 0}
          className="btn-dark"
        >
          Share
        </button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const activeFiles  = useSelector((s) => s.files.items);
  const trashFiles   = useSelector((s) => s.trash.items);
  const shares       = useSelector((s) => s.shares.items);

  const [panelMode, setPanelMode] = useState('stats'); // 'stats' | 'upload'
  const [staged, setStaged]       = useState([]);      // { id, file }
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);
  const idRef = useRef(0);

  const { enqueue } = useUploadQueue();

  // Computed values
  const totalUsed   = [...activeFiles, ...trashFiles].reduce((a, f) => a + (f.size || 0), 0);
  const usedPercent = Math.min((totalUsed / MAX_STORAGE_BYTES) * 100, 100);

  const activeShares   = shares.filter(s => s.status === 'active');
  const now            = Date.now();
  const sevenDays      = 7 * 24 * 3600 * 1000;
  const expiringShares = activeShares.filter(s =>
    s.expires_at && new Date(s.expires_at).getTime() - now < sevenDays
  );

  // ─── Staging helpers ───────────────────────────────────────────────────────
  const stageFiles = useCallback((files) => {
    const items = Array.from(files).map(file => ({
      id: ++idRef.current,
      file,
    }));
    setStaged(prev => [...prev, ...items]);
    setPanelMode('upload');
  }, []);

  const removeStaged = useCallback((id) => {
    setStaged(prev => {
      const next = prev.filter(i => i.id !== id);
      if (next.length === 0) setPanelMode('stats');
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setStaged([]);
    setPanelMode('stats');
  }, []);

  const handleUploadOnly = useCallback(() => {
    const { rejected } = enqueue(staged.map(i => i.file));
    rejected.forEach(({ name, reason }) => toast.error(`${name}: ${reason}`));
    clearAll();
  }, [staged, enqueue, clearAll]);

  const handleShare = useCallback(() => {
    // Upload + navigate to shares after (for now same as upload)
    const { rejected } = enqueue(staged.map(i => i.file));
    rejected.forEach(({ name, reason }) => toast.error(`${name}: ${reason}`));
    clearAll();
    toast.success('Files queued — share links coming soon!');
  }, [staged, enqueue, clearAll]);

  // ─── Cloud card drag handlers ──────────────────────────────────────────────
  const onCloudDragEnter = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragging(true);
  }, []);

  const onCloudDragLeave = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const onCloudDragOver = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const onCloudDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length) stageFiles(e.dataTransfer.files);
  }, [stageFiles]);

  const onCloudClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileInputChange = useCallback((e) => {
    if (e.target.files?.length) stageFiles(e.target.files);
    e.target.value = '';
  }, [stageFiles]);

  return (
    <div className="flex flex-col md:grid grid-cols-2 gap-6 lg:gap-10 h-full">

      <h1 className="md:hidden font-display font-bold text-3xl text-text-primary px-1 pt-1">
        {getGreeting(user?.full_name)}
      </h1>
      <div className='hidden md:flex flex-col gap-16'>
        {/* Greeting */}
        <h1 className="font-display font-bold text-3xl md:text-4xl text-text-primary px-1 pt-1">
          {getGreeting(user?.full_name)}
        </h1>
        {/* ── Cloud card ── */}
        <div
          className={`flex-1 bg-surface rounded-2xl shadow-card flex flex-col items-center justify-center hover:cursor-pointer select-none transition-all duration-200 relative overflow-hidden
            ${isDragging ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg animate-pulse' : 'hover:shadow-card-hover'}`}
          style={{ minHeight: 400 }}
          onDragEnter={onCloudDragEnter}
          onDragLeave={onCloudDragLeave}
          onDragOver={onCloudDragOver}
          onDrop={onCloudDrop}
          onClick={onCloudClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf,.txt"
            className="hidden"
            onChange={onFileInputChange}
          />

          {/* Drag hint text */}
          <p className="text-text-muted text-sm mb-6 pointer-events-none">
            drag and drop files
          </p>

          {/* Cloud image */}
          <img
            src={cloudImg}
            alt="cloud"
            className={`w-64 md:w-72 lg:w-80 h-auto pointer-events-none transition-all duration-500 ${
              isDragging ? 'scale-105 drop-shadow-lg' : ''
            } ${
              panelMode === 'upload' ? 'animate-pulse-slow drop-shadow-[0_10px_8px_rgba(59,130,246,0.2)]' : ''
            }`}
            draggable={false}
          />

          {/* Label */}
          <p className="font-display font-semibold text-2xl text-text-primary mt-6 pointer-events-none">
            my cloud
          </p>

          {/* Drag overlay glow */}
          {isDragging && (
            <div className="absolute inset-0 bg-accent/5 pointer-events-none rounded-2xl" />
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      {/* ── Right panel ── */}
      <div className="grid grid-cols-1 grid-rows-1">
        {/* Stats panel */}
        <div
          className={`col-start-1 row-start-1 transition-all duration-300 ${
            panelMode === 'stats'
              ? 'opacity-100 translate-y-0 z-10'
              : 'opacity-0 translate-y-2 z-0 pointer-events-none'
          }`}
        >
          <StatsPanel
            activeSharesCount={activeShares.length}
            expiringShares={expiringShares}
            usedPercent={usedPercent}
          />
        </div>

        {/* Upload list panel */}
        <div
          className={`col-start-1 row-start-1 transition-all duration-300 ${
            panelMode === 'upload'
              ? 'opacity-100 translate-y-0 z-10'
              : 'opacity-0 translate-y-2 z-0 pointer-events-none'
          }`}
        >
          <UploadListPanel
            staged={staged}
            onRemove={removeStaged}
            onClearAll={clearAll}
            onUploadOnly={handleUploadOnly}
            onShare={handleShare}
          />
        </div>
      </div>
  </div>
  );
}

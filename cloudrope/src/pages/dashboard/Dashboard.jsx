import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { useUploadContext } from '../../context/UploadContext';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { fetchFiles } from '../../store/filesSlice';
import { fetchShares } from '../../store/sharesSlice';
import { fetchTrash } from '../../store/trashSlice';
import { X, Settings } from 'lucide-react';
import { Link as Link2 } from 'lucide-react';
import { MAX_STORAGE_BYTES } from '../../utils/formatters';
import toast from 'react-hot-toast';
import cloudImg from '../../assets/cloud.png';
import ShareModal from '../../components/ui/ShareModal';

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
function StorageGauge({ usedPercent, onCloud = false }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - usedPercent / 100);

  return (
    <div className={`flex flex-col items-center transition-all duration-300 ${
      onCloud 
        ? 'absolute top-1/2 -mt-5 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-80 lg:scale-105 pointer-events-none' 
        : 'gap-2'
    }`}> 
      <div className="relative flex items-center justify-center drop-shadow-xl">
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none" 
            stroke={onCloud ? "rgba(219, 234, 254, 0.6)" : "#DBEAFE"} 
            strokeWidth="18"
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
            style={{ 
              transform: 'rotate(-90deg)', 
              transformOrigin: '60px 60px', 
              transition: 'stroke-dashoffset 0.6s ease' 
            }}
          />
        </svg>
        
        {/* Percentage text inside the circle if onCloud */}
        {onCloud && (
          <p className="absolute font-bold text-xl text-text-primary">
            {Math.round(usedPercent)}%
          </p>
        )}
      </div>

      {/* Original text position for the StatsPanel (non-cloud version) */}
      {!onCloud && (
        <p className="font-bold text-3xl text-text-primary">
          {Math.round(usedPercent)}%
        </p>
      )}
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
      <div className="bg-surface rounded-2xl shadow-card p-5 h-full flex flex-col">
        <p className="text-sm text-text-muted font-medium mb-5">Activity</p>

        {/* Calendar strip */}
        <div className="bg-elevated rounded-xl p-4 mb-5 hover:shadow-card-hover transition-shadow">
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
                  {hasExpiry
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
        <div className="grid grid-cols-2 md:flex md:flex-col lg:grid lg:grid-cols-2 gap-5">
          {/* Active shares */}
          <button
            onClick={() => navigate('/dashboard/shares')}
            className="flex-1 bg-elevated text-center rounded-xl p-4 hover:shadow-card-hover transition-shadow"
          >
            <p className="text-sm text-text-muted mb-4">Active Shares</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-accent font-bold text-4xl">{activeSharesCount}</p>
              <Link2 size={25} strokeWidth={3} className="text-accent" />
            </div>
          </button>

          {/* Storage gauge */}
          <button 
            onClick={() => navigate('/dashboard/files')}
            className="flex-1 bg-accent-light rounded-xl p-4 flex flex-col items-center justify-center hover:shadow-card-hover transition-shadow"
          >
            <StorageGauge usedPercent={usedPercent} />
          </button>
        </div>

        {/* Settings shortcut */}
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="flex md:hidden lg:flex mt-5 w-full bg-elevated rounded-xl px-4 py-5 text-sm font-medium text-text-muted hover:text-text-primary hover:shadow-card-hover transition-all items-center gap-2"
        >
          <Settings size={15} />
          Settings
        </button>
      </div>
    </div>
  );
}

// ─── Upload List Panel ────────────────────────────────────────────────────────
function UploadListPanel({ staged, onRemove, onClearAll, onUploadOnly, onShare, isZipping }) {

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
      <div className="flex-1 space-y-2 mb-5 overflow-y-auto">
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
          disabled={staged.length === 0 || isZipping}
          className="btn-dark"
        >
          {isZipping ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {staged.length > 1 ? 'Zipping…' : 'Uploading…'}
            </span>
          ) : 'Share'}
        </button>
      </div>

    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { staged, setStaged, stageFiles } = useOutletContext();

  const activeFiles  = useSelector((s) => s.files.items);
  const trashFiles   = useSelector((s) => s.trash.items);
  const shares       = useSelector((s) => s.shares.items);

  useEffect(() => {
    dispatch(fetchFiles()); 
    dispatch(fetchShares());
    dispatch(fetchTrash());
  }, [dispatch]);

  const [panelMode, setPanelMode] = useState(staged.length > 0 ? 'upload' : 'stats'); // 'stats' | 'upload'
  const [shareQueue, setShareQueue] = useState([]);      // uploaded files awaiting ShareModal
  const [isZipping,  setIsZipping]  = useState(false);    // true while zipping + uploading
  const [isDragging, setIsDragging] = useState(false);
  const [isSharingStaged, setIsSharingStaged] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef(null);
  const idRef = useRef(0);

  const { enqueue, startAll, queue } = useUploadContext();

  useEffect(() => {
    if (staged.length > 0) {
      setPanelMode('upload');
    } else {
      setPanelMode('stats');
    }
  }, [staged.length]);

  // Computed values
  const totalUsed   = [...activeFiles, ...trashFiles].reduce((a, f) => a + (f.size || 0), 0);
  const usedPercent = Math.min((totalUsed / MAX_STORAGE_BYTES) * 100, 100);

  const activeShares   = shares.filter(s => s.status === 'active');
  const now            = Date.now();
  const sevenDays      = 7 * 24 * 3600 * 1000;
  const expiringShares = activeShares.filter(s =>
    s.expires_at && new Date(s.expires_at).getTime() - now < sevenDays
  );

  const removeStaged = useCallback((id) => {
    setStaged(prev => prev.filter(i => i.id !== id));
  }, [setStaged]);

  const clearAll = useCallback(() => {
    setStaged([]);
  }, [setStaged]);

  const handleUploadOnly = useCallback(() => {
    const { rejected } = enqueue(staged.map(i => i.file));
    rejected.forEach(({ name, reason }) => toast.error(`${name}: ${reason}`));
    startAll();
    clearAll();
  }, [staged, enqueue, clearAll, startAll]);

  const handleShare = useCallback(() => {
    if (staged.length === 0) return;
    setIsSharingStaged(true); // Just open the modal
  }, [staged.length]);

  const handleShareModalClose = useCallback(() => {
    setShareQueue([]);
    setIsSharingStaged(false);
  }, []);

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

      <h1 className="md:hidden mt-5 font-display font-bold text-3xl text-text-primary px-1 pt-1">
        {panelMode === 'stats' ? getGreeting(user?.full_name) : 'file upload'}
      </h1>
      <div className='hidden md:flex flex-col gap-8'>
        {/* Greeting */}
        <h1 className="font-display pt-2 pl-2 font-semibold text-3xl text-text-primary">
          {panelMode === 'stats' ? getGreeting(user?.full_name) : 'file upload'}
        </h1>
        {/* ── Cloud card ── */}
        <div
          className={`flex-1 bg-surface rounded-2xl shadow-card flex flex-col items-center justify-center hover:cursor-pointer select-none transition-all duration-300 animate-slide-up relative overflow-hidden
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
          <p className="text-text-muted text-lg font-light mb-6 pointer-events-none">
            drag and drop files
          </p>

          {/* Cloud image */}
          <img
            src={cloudImg}
            alt="cloud"
            className={`w-64 md:w-72 lg:w-80 h-auto pointer-events-none transition-all duration-500 ease-in-out ${
              isDragging ? 'scale-105 drop-shadow-[0_10px_20px_rgba(59,130,246,0.6)]' : ''
            } ${
              panelMode === 'upload' ? 'animate-pulse-slow drop-shadow-[0_10px_20px_rgba(59,130,246,0.6)]' : ''
            }`}
            draggable={false}
          />

          <StorageGauge usedPercent={usedPercent} onCloud={true}/>

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
            isZipping={isZipping}
          />
        </div>
      </div>

      {/* Share modal */}
      {(isSharingStaged || shareQueue.length > 0) && (
        <ShareModal
          file={shareQueue[0]} 
          isOpen={isSharingStaged || shareQueue.length > 0}
          stagedFiles={isSharingStaged ? staged : null}
          onClose={handleShareModalClose}
          onShareSuccess={() => {
            clearAll(); // Clear staging only on success
          }}
        />
      )}
    </div>
  );
}
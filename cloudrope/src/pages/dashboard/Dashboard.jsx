import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { useUploadContext } from '../../context/UploadContext';
import { Link, useOutletContext, useNavigate } from 'react-router-dom';
import { fetchFiles } from '../../store/filesSlice';
import { fetchShares } from '../../store/sharesSlice';
import { fetchTrash } from '../../store/trashSlice';
import { X, Settings, Flame, Cloud, Minus } from 'lucide-react';
import { Link as Link2, Star, Bell, BellDot, File, Share, Share2 } from 'lucide-react';
import { MAX_STORAGE_BYTES } from '../../utils/formatters';
import toast from 'react-hot-toast';
import cloudImg from '../../assets/cloud.png';
import cloudyAI from '../../assets/cloudyai.svg'
import ShareModal from '../../components/ui/ShareModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDayEmoji() {
  const h = new Date().getHours();
  const time = h < 12 ? '⛅' : h < 18 ? '🌞' : '🌙';
  return time;
}

function getCalendarDates() {
  const today = new Date();
  return [-2, -1, 0, 1, 2].map(offset => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return d;
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeLabel(type) {
  const map = {
    'image/jpeg': 'JPG', 'image/png': 'PNG',
    'application/pdf': 'PDF', 'text/plain': 'TXT',
    'application/zip': 'ZIP',
  };
  return map[type] || type?.split('/')[1]?.toUpperCase().slice(0, 4) || '?';
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
  
  {/* Dummy count */}
  const streakCount = 3;
  const notificationsCount = 4;

  return (
    <div className="flex flex-col md:h-full animate-fade-up">
      {/* Activity header */}
      <div className="bg-surface rounded-3xl shadow-card p-5 flex flex-col gap-4 h-full overflow-y-auto">
        <div className='px-2 flex justify-between'>
          <p className="text-sm text-text-muted font-medium">Activity</p>
          <div className='flex gap-1'>
            <span className='text-sm pt-0.5'>{streakCount}</span>
            <Flame size={20} className='text-amber-600' />
          </div>
        </div>

        {/* Calendar strip */}
        <div className="bg-elevated rounded-2xl p-4 hover:shadow-card-hover transition-shadow">
          <div className='flex justify-between items-end  mb-3'>
            <span className="text-sm font-medium text-text-primary">
              {DAY_NAMES[today.getDay()]}, {ordinal(today.getDate())} {MONTH_NAMES[today.getMonth()]}
            </span>
            <Link to='/dashboard/activity' className='text-xs text-text-muted hover:text-text-primary'>
              View activity
            </Link>
          </div>

          <div className="flex items-center justify-between px-3 md:px-0">
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
                  <span className={`font-medium w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                    isToday
                      ? 'text-accent font-bold text-2xl md:text-xl'
                      : 'text-text-muted md:text-sm'
                  }`}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Expiry warning */}
          <div className={`mt-5 flex items-center gap-2 ${expiringShares.length > 0 ? 'bg-red-100' : 'bg-white'} rounded-lg px-3 py-2`}>
            {expiringShares.length > 0 ?
              <>
                <span className="w-2 h-2 rounded-full bg-error flex-shrink-0" />
                <p className="text-xs text-red-700">Shares expiring</p>
              </>
              :
              <>
                <span className="w-2 h-2 rounded-full bg-elevated flex-shrink-0" />
                <p className="text-xs text-text-muted">All clear</p>
              </>
            }              
          </div>
        </div>

        <div className='px-2 flex justify-between'>
          <p className="text-sm text-text-muted font-medium">Apps and Info</p>
        </div>

        {/* Active shares + Cloudy AI row */}
        <div className="grid grid-cols-2 gap-5">
          {/* Active shares */}
          <button
            onClick={() => navigate('/dashboard/shares')}
            className="flex-1 bg-elevated text-center rounded-3xl p-6 hover:shadow-card-hover transition-shadow"
          >
            <p className="text-sm text-text-muted mb-4">Active Shares</p>
            <div className={`flex items-center justify-center gap-2 ${activeSharesCount > 0 ? 'text-accent' : 'text-text-muted'}`}>
              <p className='font-bold text-4xl'>{activeSharesCount}</p>
              <Link2 size={25} strokeWidth={3} />
            </div>
          </button>

          {/* Cloudy AI */}
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex-1 bg-accent-light rounded-3xl p-6 flex flex-col items-center justify-center hover:shadow-card-hover transition-shadow"
          >
            <img src={cloudyAI} className='w-16 mb-4' alt="Icon for Cloudy AI" />
            <span className='text-text-muted text-sm font-semibold'>cloudy AI</span>
          </button>
        </div>

        {/* Storage card */}
        <Link to='/dashboard/files'
          className={`md:hidden bg-elevated pb-2 pt-5 rounded-3xl shadow-card flex items-center justify-center hover:cursor-pointer select-none transition-all duration-300 animate-slide-up relative overflow-hidden`}
        >
          <span className='text-sm text-text-primary font-semibold'>Storage</span>
          <div className='relative'>
            {/* Cloud image */}
            <img
              src={cloudImg}
              alt="cloud"
              className={`w-56 md:w-72 lg:w-80 h-auto pointer-events-none transition-all duration-500 ease-in-out`}
              draggable={false}
            />

            <StorageGauge usedPercent={usedPercent} onCloud={true}/>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-5">
          <button
            onClick={() => navigate('/dashboard/clouds')}
            className="flex-1 bg-accent-light text-center text-text-muted rounded-3xl p-6 hover:shadow-card-hover transition-shadow"
          >
            <div className={`flex items-center justify-center mb-3`}>
              <Cloud size={50} strokeWidth={2} />
            </div>
            <p className="text-sm text-text-primary font-semibold">Clouds</p>
          </button>
          <button
            onClick={() => navigate('/dashboard/notifications')}
            className="flex-1 bg-elevated text-center rounded-3xl p-6 hover:shadow-card-hover transition-shadow"
          >
            <p className="text-sm text-text-muted mb-4">Notifications</p>
            <div className={`flex items-center justify-center gap-2 ${notificationsCount > 0 ? 'text-accent' : 'text-text-muted'}`}>
              <p className='font-bold text-4xl'>{notificationsCount}</p>
              <Bell size={25} strokeWidth={3} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function StagedFileDetail({ item, onClose }) {
  const { file } = item;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl p-5 shadow-2xl w-72 mx-4 animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] font-bold text-accent bg-accent/10 rounded-md px-2 py-1 uppercase tracking-wide">
            {getMimeLabel(file.type)}
          </span>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={15} />
          </button>
        </div>
        <p className="text-text-primary text-sm font-medium break-all mb-4 leading-snug">{file.name}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-elevated rounded-xl px-3 py-2.5">
            <p className="text-text-muted text-xs mb-0.5">Size</p>
            <p className="text-text-primary text-xs font-semibold">{formatSize(file.size)}</p>
          </div>
          <div className="bg-elevated rounded-xl px-3 py-2.5">
            <p className="text-text-muted text-xs mb-0.5">Type</p>
            <p className="text-text-primary text-xs font-semibold truncate">{file.type || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Upload List Panel ────────────────────────────────────────────────────────
function UploadListPanel({ staged, onDetailItemChange, onRemove, onClearAll, onUploadOnly, onShare, isZipping }) {
  const totalSize = staged.reduce((acc, i) => acc + i.file.size, 0);

  return (
    <div className="bg-surface/30 hover:bg-surface/60 hover:shadow-lg rounded-2xl shadow-card p-5 animate-fade-up flex flex-col md:h-full transition-all duration-300" style={{ minHeight: 360 }}>
      <div className="flex items-center justify-between mb-4 px-2">
        <p className="text-sm font-semibold">
          <span className='text-text-muted text-xs'>
            {staged.length} file{staged.length !== 1 ? 's' : ''} · {formatSize(totalSize)}
          </span>
        </p>
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
      <div className="space-y-2 mb-5 overflow-y-auto md:max-h-[400px]">
        {staged.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">No files staged</p>
        )}
        {staged.map((item) => (
          <div
            key={item.id}
            onClick={() => onDetailItemChange(item)}
            className="flex items-center gap-3 bg-accent-light rounded-xl px-3 py-2.5 hover:cursor-pointer hover:bg-accent/10 transition-colors"
          >
            {/* MIME badge */}
            <span className="text-[9px] font-bold text-accent bg-white/70 rounded px-1.5 py-0.5 uppercase tracking-wide flex-shrink-0 w-8 text-center">
              {getMimeLabel(item.file.type)}
            </span>
            <p className="flex-1 text-sm text-text-primary truncate">{item.file.name}</p>
            <span className="text-xs text-text-muted flex-shrink-0 hidden sm:block">
              {formatSize(item.file.size)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(item.id)}
              }
              className="text-error hover:bg-error/10 p-1 rounded transition-colors flex-shrink-0"
            >
              <Minus size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="space-y-2 hidden md:block">
        <button
          onClick={onUploadOnly}
          disabled={staged.length === 0}
          className="btn-primary-full rounded-2xl"
        >
          Upload To Cloud
        </button>
        <button
          onClick={onShare}
          disabled={staged.length === 0 || isZipping}
          className="btn-dark rounded-2xl"
        >
          {isZipping ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {staged.length > 1 ? 'Zipping…' : 'Uploading…'}
            </span>
          ) : 
          <span className='flex gap-2 items-center justify-center'>
            Drop Rope <Link2 size={16} />
          </span>}
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
  const [detailItem, setDetailItem] = useState(null);
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
    <div className="md:h-full flex flex-col md:grid grid-cols-2 gap-6 lg:gap-10">
      <div className='flex flex-col gap-6 justify-between'>
        <h1 className={`${ panelMode === 'upload' ? 'hidden' : ''} mt-3 md:mt-0 pt-2 pl-2 font-display font-bold text-text-primary text-center md:text-left text-2xl animate-slide-up`}>dashboard {getDayEmoji()}</h1>

        <div className={`${ panelMode === 'upload' ? '' : 'md:grid'} hidden grid-cols-3 gap-5 flex-1 max-h-32`}>
          <Link to="/dashboard/files" className='bg-blue-50 py-3 px-8 rounded-3xl shadow-card hover:shadow-card-hover flex flex-col items-center justify-center gap-2 text-blue-500 hover:text-accent select-none transition-all duration-300 animate-slide-up relative overflow-hidden'>
            <File size={30}/>
            <span className='text-sm font-semibold'>files</span>
          </Link>
          <Link to='/dashboard/shares' className='bg-green-50 py-3 px-8 rounded-3xl shadow-card hover:shadow-card-hover flex flex-col items-center justify-center gap-2 text-green-400 hover:text-green-500 select-none transition-all duration-300 animate-slide-up relative overflow-hidden'>
            <Share2 size={30}/>
            <span className='text-sm font-semibold'>shares</span>
          </Link>
          <Link to='/dashboard/favorites' className='bg-amber-50 py-3 px-8 rounded-3xl shadow-card hover:shadow-card-hover flex flex-col items-center justify-center gap-2 text-amber-400 hover:text-amber-500 select-none transition-all duration-300 animate-slide-up relative overflow-hidden'>
            <Star size={30}/>
            <span className='text-sm font-semibold'>favorites</span>
          </Link>
        </div>

        { panelMode == 'upload' && 
          <div className='flex flex-col items-center md:items-start animate-slide-up'>
            <h1 className='mt-3 font-display pt-2 md:pl-2 text-2xl font-bold text-text-primary flex items-center gap-2'>file upload <Share size={22}  className='text-accent'/></h1>

            <div className='md:hidden w-[80%] max-w-[200px] flex flex-col items-center gap-3 mt-5'>
               <button
                  onClick={handleUploadOnly}
                  disabled={staged.length === 0}
                  className="btn-primary btn-full rounded-2xl"
                >
                  Upload To Cloud
                </button>

                <button
                  onClick={handleShare}
                  disabled={staged.length === 0 || isZipping}
                  className="btn-dark rounded-2xl"
                >
                  {isZipping ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {staged.length > 1 ? 'Zipping…' : 'Uploading…'}
                    </span>
                  ) :
                  <span className='flex gap-2 items-center justify-center'>
                    Drop Rope <Link2 size={16} />
                  </span>
                  }
                </button>
            </div>
          </div> 
        }

        {/* ── Cloud card ── */}
        <div
          className={`hidden md:flex bg-surface/30 flex-1 rounded-3xl shadow-card flex-col items-center justify-center hover:cursor-pointer select-none transition-all duration-300 animate-slide-up relative overflow-hidden
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
              isDragging ? 'scale-110 drop-shadow-[0_10px_20px_rgba(59,130,246,0.6)]' : ''
            } ${
              panelMode === 'upload' ? 'animate-pulse-slow scale-105 drop-shadow-[0_10px_20px_rgba(59,130,246,0.6)]' : ''
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
      <div className="grid grid-cols-1 grid-rows-1 md:h-full">
        {/* Stats panel */}
        <div
          className={`col-start-1 row-start-1 transition-all duration-300 ${
            panelMode === 'stats'
              ? 'translate-y-0 z-10'
              : 'hidden translate-y-2 z-0 pointer-events-none'
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
            onDetailItemChange={setDetailItem}
            onRemove={removeStaged}
            onClearAll={clearAll}
            onUploadOnly={handleUploadOnly}
            onShare={handleShare}
            isZipping={isZipping}
          />
        </div>
      </div>

      {detailItem && (
        <StagedFileDetail item={detailItem} onClose={() => setDetailItem(null)} />
      )}

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
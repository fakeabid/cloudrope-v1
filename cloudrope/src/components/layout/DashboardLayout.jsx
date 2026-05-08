import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { UploadProvider, useUploadContext } from '../../context/UploadContext';
import { fetchFiles } from '../../store/filesSlice';
import { fetchTrash } from '../../store/trashSlice';
import {
  LayoutDashboard, Files, Star, Trash2, Share2, Settings,
  LogOut, CloudUpload, Menu,
} from 'lucide-react';
import toast from 'react-hot-toast';
import UploadQueueTray from '../ui/UploadQueueTray';
import { formatFileSize, MAX_STORAGE_BYTES } from '../../utils/formatters';

const navItems = [
  { to: '/dashboard',           label: 'Dashboard', icon: LayoutDashboard, end: true  },
  { to: '/dashboard/files',     label: 'My Files',  icon: Files,           end: false },
  { to: '/dashboard/favorites', label: 'Favorites', icon: Star,            end: false },
  { to: '/dashboard/trash',     label: 'Trash',     icon: Trash2,          end: false },
  { to: '/dashboard/shares',    label: 'My Shares', icon: Share2,          end: false },
  { to: '/dashboard/settings',  label: 'Settings',  icon: Settings,        end: false },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────
function SidebarContent({ user, usedPercent, totalUsed, onLogout, onNavClick }) {
  const favoriteIds = useSelector((s) => s.favorites.ids);
  const files       = useSelector((s) => s.files.items);
  const pinnedCount = favoriteIds.filter((id) => files.some((f) => f.id === id)).length;

  return (
    <>
      <div className="px-5 pt-6 pb-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
            <CloudUpload size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-text-primary text-lg tracking-tight">Cloudrope</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end} onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-elevated'
              }`
            }
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {label === 'Favorites' && pinnedCount > 0 && (
              <span className="text-xs bg-warning/15 text-warning px-1.5 py-0.5 rounded-md font-medium">
                {pinnedCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border space-y-2 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Storage</span>
          <span>{formatFileSize(totalUsed)} / 100 MB</span>
        </div>
        <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              usedPercent > 85 ? 'bg-error' : usedPercent > 60 ? 'bg-warning' : 'bg-accent'
            }`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        {usedPercent > 85 && <p className="text-error text-xs">Storage almost full.</p>}
      </div>

      <div className="px-4 pb-5 pt-1 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-3 pt-3">
          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-accent text-xs font-display font-bold">
              {user?.first_name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-text-primary text-xs font-medium truncate">{user?.full_name}</p>
            <p className="text-text-muted text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-text-muted hover:text-error text-xs font-medium transition-colors w-full px-1 py-1 rounded"
        >
          <LogOut size={13} />Sign out
        </button>
      </div>
    </>
  );
}

// ── Inner layout (has access to UploadContext) ─────────────────────────────────
function DashboardInner() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const dispatch  = useDispatch();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDragging,  setIsDragging]  = useState(false);
  const dragCounter = useRef(0);

  const { enqueue, queue, clearDone, retryItem, removeItem, isActive, doneCount, errorCount } =
    useUploadContext();

  const activeFiles = useSelector((s) => s.files.items);
  const trashFiles  = useSelector((s) => s.trash.items);
  const filesStatus = useSelector((s) => s.files.status);
  const trashStatus = useSelector((s) => s.trash.status);

  useEffect(() => {
    if (filesStatus === 'idle') dispatch(fetchFiles());
    if (trashStatus === 'idle') dispatch(fetchTrash());
  }, [dispatch, filesStatus, trashStatus]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const totalUsed   = [...activeFiles, ...trashFiles].reduce((acc, f) => acc + (f.size || 0), 0);
  const usedPercent = Math.min((totalUsed / MAX_STORAGE_BYTES) * 100, 100);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/');
  };

  // ── Global drag handlers ──────────────────────────────────────────────────
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Ignore drag events that don't carry files (e.g. dragging a link)
    if (!e.dataTransfer.types.includes('Files')) return;
    if (++dragCounter.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (--dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files?.length) return;

    const { rejected } = enqueue(files);
    rejected.forEach(({ name, reason }) => toast.error(`${name}: ${reason}`));

    // Navigate to My Files if not already there
    if (!location.pathname.startsWith('/dashboard/files')) {
      navigate('/dashboard/files');
    }
  }, [enqueue, location.pathname, navigate]);

  return (
    <div
      className="min-h-screen bg-bg flex"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Global drag overlay ── */}
      {isDragging && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Dim backdrop */}
          <div className="absolute inset-0 bg-bg/75 backdrop-blur-sm animate-fade-in" />
          {/* Drop target card */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-2 border-dashed border-accent rounded-2xl px-20 py-14 flex flex-col items-center gap-3 bg-accent/5 animate-slide-up shadow-2xl shadow-black/40">
              <div className="w-16 h-16 bg-accent/15 rounded-2xl flex items-center justify-center mb-1">
                <CloudUpload size={28} className="text-accent" />
              </div>
              <p className="font-display font-bold text-text-primary text-xl">Drop to upload</p>
              <p className="text-text-muted text-sm">JPEG · PNG · PDF · TXT · max 10 MB each</p>
              <p className="text-accent/70 text-xs mt-1">Files will be added to My Files</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-surface border-r border-border">
        <SidebarContent user={user} usedPercent={usedPercent} totalUsed={totalUsed} onLogout={handleLogout} onNavClick={() => {}} />
      </aside>

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-surface border-r border-border transform transition-transform duration-300 ease-in-out md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent user={user} usedPercent={usedPercent} totalUsed={totalUsed} onLogout={handleLogout} onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex md:hidden items-center gap-3 px-4 py-3 bg-surface border-b border-border sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition-colors">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-accent rounded flex items-center justify-center">
              <CloudUpload size={10} className="text-white" />
            </div>
            <span className="font-display font-bold text-text-primary text-sm tracking-tight">Cloudrope</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto"><Outlet /></main>
      </div>

      {/* ── Upload queue tray (global, persists across all pages) ── */}
      <UploadQueueTray
        queue={queue} clearDone={clearDone}
        retryItem={retryItem} removeItem={removeItem}
        isActive={isActive} doneCount={doneCount} errorCount={errorCount}
      />
    </div>
  );
}

// ── Public export wraps with UploadProvider ────────────────────────────────────
export default function DashboardLayout() {
  return (
    <UploadProvider>
      <DashboardInner />
    </UploadProvider>
  );
}

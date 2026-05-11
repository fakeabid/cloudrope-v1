import { useRef, useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { fetchFiles } from '../../store/filesSlice';
import { fetchTrash } from '../../store/trashSlice';
import { UploadProvider, useUploadContext } from '../../context/UploadContext';
import {
  LayoutDashboard, Files, Share2, Trash2, Settings, User, LogOut, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import UploadQueueTray from '../ui/UploadQueueTray';
import logo from '../../assets/logo.svg'

// ── Nav items ─────────────────────────────────────────────────────────────────

const mainNavItems = [
  { to: '/dashboard',        label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/files',  label: 'Files',     icon: Files,           end: true },
  { to: '/dashboard/shares', label: 'Shares',    icon: Share2,          end: true },
  { to: '/dashboard/trash',  label: 'Trash',     icon: Trash2,          end: true },
];

const bottomNavItems = [
  { to: '/dashboard/settings', label: 'Settings', icon: Settings, end: true },
  { to: '/dashboard/profile',  label: 'Profile',  icon: User,     end: true },
];

// ── Shared components ─────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link to="/dashboard" className="p-5 text-center w-full block">
      <span className="font-display font-bold text-text-primary select-none">cloud</span>
      <span className="font-display font-bold text-accent select-none">rope</span>
    </Link>
  );
}

function SidebarContent({ onLogout, onNavClick }) {
  return (
    <div className="flex flex-col h-full">
      <Logo />
      <nav className="flex-1 mt-8 space-y-2">
        {mainNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end} onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-elevated text-text-primary'
                  : 'text-text-muted hover:text-text-primary hover:bg-elevated/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 pt-3 border-t border-border mt-4">
        {bottomNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end} onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-elevated text-text-primary'
                  : 'text-text-muted hover:text-text-primary hover:bg-elevated/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-error hover:bg-error/5 transition-all duration-150 w-full"
        >
          <LogOut size={16} strokeWidth={1.8} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ── Mobile bottom nav ─────────────────────────────────────────────────────────

// Items shown left and right of the FAB (2 each side)
const mobileLeftItems  = [mainNavItems[0], mainNavItems[1]];
const mobileRightItems = [mainNavItems[2], mainNavItems[3]];

function MobileBottomNav({ onPlusClick }) {
  return (
    <nav className="fixed bottom-4 left-4 right-4 z-30 md:hidden bg-white/50 hover:bg-white backdrop-blur-md border border-white/20 rounded-3xl shadow-lg shadow-blue-500/10 transition-all duration-300 flex items-center h-16 px-2">

      {/* Left items */}
      <div className="flex flex-1 items-center justify-around">
        {mobileLeftItems.map(({ to, icon: Icon, end, label }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? 'text-accent' : 'text-text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Center FAB */}
      <div className="flex items-center justify-center w-20">
        <button
          onClick={onPlusClick}
          className="w-14 h-14 rounded-full bg-white border border-border shadow-card-hover flex items-center justify-center -translate-y-4 transition-transform active:scale-95"
          aria-label="Upload files"
        >
          <Plus size={24} className="text-accent" strokeWidth={2.5} />
        </button>
      </div>

      {/* Right items */}
      <div className="flex flex-1 items-center justify-around">
        {mobileRightItems.map(({ to, icon: Icon, end, label }) => (
          <NavLink
            key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? 'text-accent' : 'text-text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// ── Inner layout (needs UploadContext) ────────────────────────────────────────

function DashboardLayoutInner() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [staged, setStaged] = useState([]);
  const idRef = useRef(0);
  const dispatch   = useDispatch();

  const filesStatus = useSelector((s) => s.files.status);
  const trashStatus = useSelector((s) => s.trash.status);

  const mobileFileRef = useRef(null);
  const { enqueue, queue, clearDone, retryItem, removeItem, isActive, doneCount, errorCount } = useUploadContext();

  useEffect(() => {
    if (filesStatus === 'idle') dispatch(fetchFiles());
    if (trashStatus === 'idle') dispatch(fetchTrash());
  }, [dispatch, filesStatus, trashStatus]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/');
  };

  const stageFiles = (files) => {
    const items = Array.from(files).map(file => ({
      id: ++idRef.current,
      file,
    }));
    setStaged(prev => [...prev, ...items]);
    
    // Crucial: if they aren't on the dashboard, take them there to see the list
    if (window.location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
  };

  const handleMobileFileChange = (e) => {
    if (e.target.files?.length) {
      stageFiles(e.target.files); // Now it stages instead of enqueuing!
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-bg flex gap-3 py-10 px-6 lg:px-10">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-44 lg:w-64 flex-shrink-0 flex-col bg-surface rounded-2xl shadow-card px-4 py-5">
        <SidebarContent onLogout={handleLogout} onNavClick={() => {}} />
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile logo bar */}
        <header className="md:hidden fixed top-6 inset-x-0 mx-auto z-50 w-[93%] max-w-3xl">
          <div className="flex items-center justify-center px-6 py-2 bg-white/60 hover:bg-white backdrop-blur-md border border-white/20 rounded-2xl shadow-lg shadow-blue-500/5 transition-all duration-300">     
            {/* Logo */}
            <Link to="/" className="flex items-center mt-2 gap-1 hover:cursor-pointer hover:opacity-90 transition-all duration-200">
              <span className="font-display font-extrabold text-text-primary text-sm tracking-wide flex">
                cloud<span className='text-accent flex'>rope</span>
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0 mt-12 md:mt-0 md:ml-3 lg:ml-8 pb-20 md:pb-0">
          <Outlet context={{ staged, setStaged, stageFiles }}/>
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <MobileBottomNav onPlusClick={() => mobileFileRef.current?.click()} />

      {/* Hidden file input for mobile FAB */}
      <input
        ref={mobileFileRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf,.txt"
        className="hidden"
        onChange={handleMobileFileChange}
      />

      {/* ── Upload queue tray (shared, layout-level) ── */}
      <UploadQueueTray
        queue={queue}
        clearDone={clearDone}
        retryItem={retryItem}
        removeItem={removeItem}
        isActive={isActive}
        doneCount={doneCount}
        errorCount={errorCount}
      />
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function DashboardLayout() {
  return (
    <UploadProvider>
      <DashboardLayoutInner />
    </UploadProvider>
  );
}

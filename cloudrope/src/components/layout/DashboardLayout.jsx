import { useRef, useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { fetchFiles } from '../../store/filesSlice';
import { fetchTrash } from '../../store/trashSlice';
import { UploadProvider, useUploadContext } from '../../context/UploadContext';
import {
  LayoutDashboard, Files, Share2, Trash2, Settings, User, LogOut, Plus,
  Star,
  CalendarClock,
  Bell,
  Cloud,
  FolderOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import UploadQueueTray from '../ui/UploadQueueTray';
import logo from '../../assets/logo.svg';

// ── Nav items ─────────────────────────────────────────────────────────────────

const mainNavItems = [
  { to: '/dashboard',        label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/activity',  label: 'Activity', icon: CalendarClock, end: true },
  { to: '/dashboard/favorites', label: 'Favorites', icon: Star,         end: true },
  { to: '/dashboard/files',  label: 'Files',     icon: Files,           end: true },
  { to: '/dashboard/shares', label: 'Shares',    icon: Share2,          end: true },
  { to: '/dashboard/trash',  label: 'Trash',     icon: Trash2,          end: true },
  { to: '/dashboard/clouds', label: 'Clouds', icon: Cloud, end: true },
];

const bottomNavItems = [
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell, end: true },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings, end: true },
  { to: '/dashboard/profile',  label: 'Profile',  icon: User,     end: true },
];

const fileNavItems = [
  { to: '/dashboard/files',  label: 'Files',     icon: Files,           end: true },
  { to: '/dashboard/shares', label: 'Shares',    icon: Share2,          end: true },
  { to: '/dashboard/trash',  label: 'Trash',     icon: Trash2,          end: true },
];


// ── Shared components ─────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link to="/dashboard" className="p-5 mt-3 text-center w-full flex justify-center items-center gap-2">
      <img src={logo} alt="Cloudrope logo" className='w-10' />      
    </Link>
  );
}

function SidebarContent({ onLogout, onNavClick }) {
  return (
    <div className="flex flex-col h-full">
      <Logo />
      <nav className="flex-1 mt-5 space-y-2 overflow-y-auto">
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
const mobileLeftItems  = [
  { to: '/dashboard',        label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/dashboard/favorites',  label: 'Favorites',     icon: Star,    end: true },
];
const mobileRightItems = [
  { to: '/dashboard/files', label: 'Folders',    icon: FolderOpen,      end: true },
  { to: '/dashboard/profile',  label: 'Profile',  icon: User,     end: true },
];

function MobileBottomNav({ onPlusClick, isFoldersSection }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/20 hover:bg-white backdrop-blur-md border border-white/20 rounded-t-3xl shadow-lg shadow-blue-500/10 transition-all duration-300 flex items-center h-16 px-2">

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
        {mobileRightItems.map(({ to, icon: Icon, end, label }) => {
          const isFoldersButton = to === '/dashboard/files';

          return (
            <NavLink
              key={to} to={to} end={end}
              className={({ isActive }) => {
                const active = isFoldersButton
                  ? isFoldersSection
                  : isActive;
                return `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? 'text-accent' : 'text-text-muted'
                }`}
              }
            >
              {({ isActive }) => {
                const active = isFoldersButton
                  ? isFoldersSection
                  : isActive;

                return (
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                );
              }}
            </NavLink>
          );
        })}
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

  const isFoldersSection =
    location.pathname.startsWith("/dashboard/files") ||
    location.pathname.startsWith("/dashboard/shares") ||
    location.pathname.startsWith("/dashboard/trash");

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
    <div className="h-screen bg-bg flex gap-3 py-8 px-6 lg:px-8">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-44 h-full lg:w-64 flex-shrink-0 flex-col bg-surface rounded-3xl shadow-card px-4 py-5">
        <SidebarContent onLogout={handleLogout} onNavClick={() => {}} />
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex items-center min-w-0">

        <header className="md:hidden fixed top-0 inset-x-0 z-50 flex justify-center">
          <div className={`flex w-[80%] max-w-[500px] items-center ${isFoldersSection ? 'justify-between pb-2.5' : 'justify-center pb-3'} px-6 pt-3 bg-white/20 hover:bg-white backdrop-blur-md border border-white/20 rounded-b-2xl shadow-lg shadow-blue-500/5 transition-all duration-300`}>     

            <Link to="/" className="flex items-center mt-2 gap-2.5 hover:cursor-pointer hover:opacity-90 transition-all duration-200">
              <img src={logo} className='w-6 -mt-0.5' alt="CloudRope Logo" />
              {!isFoldersSection && <span className="font-display font-extrabold text-text-primary text-[10px] tracking-wide flex">
                cloudrope</span>}
            </Link>

            {isFoldersSection && (
              <nav className='flex gap-2'>
                {fileNavItems.map(({ to, icon: Icon, end }) => (
                  <NavLink
                    key={to} to={to} end={end} onClick={() => {}}
                    className={({ isActive }) =>
                      `flex items-center gap-4 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-elevated text-text-primary'
                          : 'text-text-muted hover:text-text-primary hover:bg-elevated/70'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>


        </header>

        <main className="flex-1 h-[600px] min-w-0 py-4 mt-3 md:mt-0 md:ml-3 lg:ml-8 pb-24 md:pb-0">
          <Outlet context={{ staged, setStaged, stageFiles }}/>
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <MobileBottomNav 
        onPlusClick={() => mobileFileRef.current?.click()}
        isFoldersSection={isFoldersSection}
      />

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

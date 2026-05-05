import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { fetchFiles } from '../../store/filesSlice';
import { fetchTrash } from '../../store/trashSlice';
import {
  Files, Trash2, Share2, Settings, LogOut, CloudUpload, Menu, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatFileSize, MAX_STORAGE_BYTES } from '../../utils/formatters';

const navItems = [
  { to: '/dashboard',          label: 'My Files',  icon: Files,    end: true  },
  { to: '/dashboard/trash',    label: 'Trash',     icon: Trash2,   end: false },
  { to: '/dashboard/shares',   label: 'My Shares', icon: Share2,   end: false },
  { to: '/dashboard/settings', label: 'Settings',  icon: Settings, end: false },
];

function SidebarContent({ user, usedPercent, totalUsed, onLogout, onNavClick }) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
            <CloudUpload size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-text-primary text-lg tracking-tight">
            Cloudrope
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-primary hover:bg-elevated'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Storage bar */}
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
        {usedPercent > 85 && (
          <p className="text-error text-xs">Storage almost full. Delete files or empty trash.</p>
        )}
      </div>

      {/* User & Logout */}
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
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeFiles = useSelector((s) => s.files.items);
  const trashFiles  = useSelector((s) => s.trash.items);
  const filesStatus = useSelector((s) => s.files.status);
  const trashStatus = useSelector((s) => s.trash.status);

  // Pre-fetch both so storage bar is accurate from any starting page
  useEffect(() => {
    if (filesStatus === 'idle') dispatch(fetchFiles());
    if (trashStatus === 'idle') dispatch(fetchTrash());
  }, [dispatch, filesStatus, trashStatus]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const totalUsed   = [...activeFiles, ...trashFiles].reduce((acc, f) => acc + (f.size || 0), 0);
  const usedPercent = Math.min((totalUsed / MAX_STORAGE_BYTES) * 100, 100);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-bg flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-surface border-r border-border">
        <SidebarContent
          user={user}
          usedPercent={usedPercent}
          totalUsed={totalUsed}
          onLogout={handleLogout}
          onNavClick={() => {}}
        />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-surface border-r border-border transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent
          user={user}
          usedPercent={usedPercent}
          totalUsed={totalUsed}
          onLogout={handleLogout}
          onNavClick={() => setSidebarOpen(false)}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center gap-3 px-4 py-3 bg-surface border-b border-border sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-accent rounded flex items-center justify-center">
              <CloudUpload size={10} className="text-white" />
            </div>
            <span className="font-display font-bold text-text-primary text-sm tracking-tight">
              Cloudrope
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

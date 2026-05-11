import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../../context/AuthContext';
import { fetchFiles } from '../../store/filesSlice';
import { fetchTrash } from '../../store/trashSlice';
import {
  LayoutDashboard, Files, Share2, Trash2, Settings, User, LogOut, Menu,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

function Logo() {
  return (
    <Link to='/dashboard' className="p-5 text-center w-full">
      <span className="font-display font-bold text-text-primary select-none">
        cloud
      </span>
      <span className="font-display font-bold text-accent select-none">
        rope
      </span>
    </Link>
  );
}

function SidebarContent({ onLogout, onNavClick }) {
  return (
    <div className="flex flex-col h-full lg:h-[562px]">
      <Logo />

      <nav className="flex-1 mt-8 space-y-2">
        {mainNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavClick}
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
            key={to}
            to={to}
            end={end}
            onClick={onNavClick}
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
          style={{ '--tw-bg-opacity': 1 }}
        >
          <LogOut size={16} strokeWidth={1.8} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const dispatch   = useDispatch();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filesStatus = useSelector((s) => s.files.status);
  const trashStatus = useSelector((s) => s.trash.status);

  useEffect(() => {
    if (filesStatus === 'idle') dispatch(fetchFiles());
    if (trashStatus === 'idle') dispatch(fetchTrash());
  }, [dispatch, filesStatus, trashStatus]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/');
  };

  return (
    <div className="bg-bg flex gap-3 p-6 md:px-8 lg:px-12">

      {/* Desktop sidebar card */}
      <aside className="hidden md:flex w-44 lg:w-64 lg:max-h-[602px] flex-shrink-0 flex-col bg-surface rounded-2xl shadow-card px-4 py-5">
        <SidebarContent onLogout={handleLogout} onNavClick={() => {}} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-surface px-4 py-5 shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent
          onLogout={handleLogout}
          onNavClick={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center gap-3 mb-3 bg-surface rounded-2xl px-4 shadow-card flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
          >
            <Menu size={18} />
          </button>
          <Logo />
        </header>

        <main className="flex-1 min-w-0 mt-10 md:ml-3 lg:ml-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

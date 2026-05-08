import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Files, Star, Share2, Trash2, Upload, ArrowRight, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchFiles } from '../../store/filesSlice';
import { fetchTrash } from '../../store/trashSlice';
import { fetchShares } from '../../store/sharesSlice';
import FileIcon from '../../components/ui/FileIcon';
import Badge from '../../components/ui/Badge';
import { formatFileSize, formatDate, MAX_STORAGE_BYTES } from '../../utils/formatters';
import { downloadFile } from '../../utils/download';

function greeting(name) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${time}, ${name}.`;
}

// Circular storage gauge using SVG
function StorageGauge({ usedBytes, totalBytes }) {
  const R = 44;
  const circ = 2 * Math.PI * R;
  const pct = Math.min(usedBytes / totalBytes, 1);
  const offset = circ * (1 - pct);
  const color = pct > 0.85 ? '#EF4444' : pct > 0.6 ? '#F59E0B' : '#4F8DFF';

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={R} fill="none" stroke="#1C1F2A" strokeWidth="10" />
          <circle
            cx="50" cy="50" r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display font-bold text-text-primary text-base leading-tight">
            {Math.round(pct * 100)}%
          </p>
          <p className="text-text-muted text-xs">used</p>
        </div>
      </div>
      <div className="text-center">
        <p className="text-text-primary text-sm font-medium">
          {formatFileSize(usedBytes)}
          <span className="text-text-muted font-normal"> / {formatFileSize(totalBytes)}</span>
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className={`card flex items-center gap-4 hover:border-${color}/30 transition-all duration-200 group`}>
      <div className={`w-10 h-10 bg-${color}/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-${color}/20 transition-colors`}>
        <Icon size={18} className={`text-${color}`} />
      </div>
      <div>
        <p className="text-text-muted text-xs">{label}</p>
        <p className="text-text-primary font-display font-bold text-xl">{value}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const { user } = useAuth();

  const { items: files, status: filesStatus } = useSelector((s) => s.files);
  const { items: trash, status: trashStatus  } = useSelector((s) => s.trash);
  const { items: shares, status: sharesStatus } = useSelector((s) => s.shares);
  const favoriteIds = useSelector((s) => s.favorites.ids);

  useEffect(() => {
    if (filesStatus  === 'idle') dispatch(fetchFiles());
    if (trashStatus  === 'idle') dispatch(fetchTrash());
    if (sharesStatus === 'idle') dispatch(fetchShares());
  }, [dispatch, filesStatus, trashStatus, sharesStatus]);

  const totalUsed    = [...files, ...trash].reduce((a, f) => a + (f.size || 0), 0);
  const recentFiles  = [...files]
    .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
    .slice(0, 5);
  const activeShares = shares.filter((s) => s.status === 'active').slice(0, 4);
  const pinnedCount  = favoriteIds.filter((id) => files.some((f) => f.id === id)).length;

  const isLoading = filesStatus === 'loading' || trashStatus === 'loading';

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-8">

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-extrabold text-text-primary text-2xl md:text-3xl">
            {user ? greeting(user.first_name) : 'Dashboard'}
          </h1>
          <p className="text-text-muted text-sm mt-1">Here's what's happening with your files.</p>
        </div>
        <Link to="/dashboard/files" className="btn-primary flex-shrink-0">
          <Upload size={14} />
          Upload files
        </Link>
      </div>

      {/* ── Stat cards + storage gauge ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          <StatCard icon={Files}  label="Total files"    value={files.length}         color="accent"   to="/dashboard/files" />
          <StatCard icon={Star}   label="Pinned"         value={pinnedCount}           color="warning"  to="/dashboard/favorites" />
          <StatCard icon={Share2} label="Active shares"  value={activeShares.length}   color="success"  to="/dashboard/shares" />
          <StatCard icon={Trash2} label="In trash"       value={trash.length}          color="error"    to="/dashboard/trash" />
        </div>

        <div className="card flex items-center justify-center px-8">
          <StorageGauge usedBytes={totalUsed} totalBytes={MAX_STORAGE_BYTES} />
        </div>
      </div>

      {/* ── Recent files ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-text-primary text-sm">Recent files</h2>
          <Link to="/dashboard/files" className="text-accent text-xs hover:underline flex items-center gap-1">
            View all <ArrowRight size={11} />
          </Link>
        </div>

        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {isLoading && (
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 bg-elevated rounded-lg animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-elevated rounded animate-pulse w-40" />
                    <div className="h-2.5 bg-elevated rounded animate-pulse w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && recentFiles.length === 0 && (
            <div className="py-10 text-center text-text-muted text-sm">No files yet.</div>
          )}

          {!isLoading && recentFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-elevated/20 transition-colors">
              <FileIcon mimeType={file.mime_type} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm truncate">{file.original_name}</p>
                <p className="text-text-muted text-xs">{file.size_display} · {formatDate(file.uploaded_at)}</p>
              </div>
              <button
                onClick={() => downloadFile(file.id, file.original_name)}
                className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors flex-shrink-0"
                title="Download"
              >
                <Download size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active shares ── */}
      {activeShares.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-text-primary text-sm">Active shares</h2>
            <Link to="/dashboard/shares" className="text-accent text-xs hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {activeShares.map((share) => (
              <div key={share.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-elevated/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm truncate">{share.file_name}</p>
                  <p className="text-text-muted text-xs">
                    {share.download_count} download{share.download_count !== 1 ? 's' : ''}
                    {share.max_downloads ? ` / ${share.max_downloads} max` : ' · Unlimited'}
                    {share.expires_at ? ` · Expires ${formatDate(share.expires_at)}` : ''}
                  </p>
                </div>
                <Badge status="active" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

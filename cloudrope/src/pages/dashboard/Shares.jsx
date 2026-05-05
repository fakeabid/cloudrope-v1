import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Share2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchShares, revokeShare } from '../../store/sharesSlice';
import Badge from '../../components/ui/Badge';
import CopyButton from '../../components/ui/CopyButton';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';
import { Skeleton } from '../../components/ui/Skeleton';
import { useSearch } from '../../hooks/useSearch';
import { usePagination } from '../../hooks/usePagination';
import { formatDateTime } from '../../utils/formatters';
import { extractErrorMessage } from '../../utils/errors';

const PAGE_SIZE = 10;

export default function Shares() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((s) => s.shares);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchShares());
  }, [dispatch, status]);

  const sorted = [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const { query, setQuery, filtered, hasQuery } = useSearch(sorted, ['file_name']);
  const { page, setPage, totalPages, paged, from, to, totalItems } = usePagination(filtered, PAGE_SIZE);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      await dispatch(revokeShare(revokeTarget.id)).unwrap();
      toast.success('Share revoked.');
    } catch (err) {
      toast.error(extractErrorMessage({ response: { data: err } }));
    } finally {
      setIsRevoking(false);
      setRevokeTarget(null);
    }
  };

  const shareUrl = (token) => `${window.location.origin}/shared/${token}`;

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-5">
        <h1 className="font-display font-bold text-text-primary text-2xl">My Shares</h1>
        <p className="text-text-muted text-sm mt-0.5">{items.length} share link{items.length !== 1 ? 's' : ''}</p>
      </div>

      {(items.length > 0 || hasQuery) && (
        <div className="mb-4">
          <SearchBar query={query} setQuery={setQuery} placeholder="Search by file name…" className="max-w-xs" />
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1.5fr_80px_130px_130px_120px_100px_80px] items-center px-4 py-2.5 border-b border-border bg-elevated/40 gap-3">
          {['File', 'Status', 'Created', 'Expires', 'Downloads', 'Link', 'Action'].map((h) => (
            <span key={h} className="text-text-muted text-xs font-medium">{h}</span>
          ))}
        </div>

        {status === 'loading' && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <AlertCircle size={24} className="text-error" />
            <p className="text-text-muted text-sm">Failed to load shares.</p>
          </div>
        )}

        {status === 'succeeded' && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-12 h-12 bg-elevated rounded-xl flex items-center justify-center">
              <Share2 size={20} className="text-text-muted" />
            </div>
            <div>
              <p className="text-text-primary text-sm font-medium">No share links yet</p>
              <p className="text-text-muted text-xs mt-0.5">Share a file from My Files to see links here.</p>
            </div>
          </div>
        )}

        {status === 'succeeded' && items.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-text-muted text-sm">No shares match "<span className="text-text-primary">{query}</span>"</p>
            <button onClick={() => setQuery('')} className="text-accent text-xs hover:underline">Clear search</button>
          </div>
        )}

        {status === 'succeeded' && paged.map((share) => (
          <div
            key={share.id}
            className="grid grid-cols-1 lg:grid-cols-[1.5fr_80px_130px_130px_120px_100px_80px] gap-2 lg:gap-3 px-4 py-3.5 border-b border-border last:border-0 hover:bg-elevated/20 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-text-primary text-sm truncate">{share.file_name}</p>
            </div>
            <div className="flex items-center">
              <Badge status={share.status} />
            </div>
            <span className="text-text-muted text-xs self-center">{formatDateTime(share.created_at)}</span>
            <span className="text-text-muted text-xs self-center">
              {share.expires_at ? formatDateTime(share.expires_at) : 'Never'}
            </span>
            <span className="text-text-muted text-xs self-center">
              {share.max_downloads
                ? `${share.download_count} / ${share.max_downloads}`
                : `${share.download_count} / Unlimited`}
            </span>
            <div className="flex items-center">
              <CopyButton text={shareUrl(share.token)} />
            </div>
            <div className="flex items-center">
              {share.status === 'active' && (
                <button
                  className="text-xs text-error hover:underline transition-colors"
                  onClick={() => setRevokeTarget(share)}
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}

        {status === 'succeeded' && filtered.length > 0 && (
          <Pagination page={page} setPage={setPage} totalPages={totalPages} from={from} to={to} totalItems={totalItems} />
        )}
      </div>

      <ConfirmDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        isLoading={isRevoking}
        title="Revoke share?"
        message={`The share link for "${revokeTarget?.file_name}" will be permanently deactivated.`}
        confirmLabel="Revoke"
      />
    </div>
  );
}

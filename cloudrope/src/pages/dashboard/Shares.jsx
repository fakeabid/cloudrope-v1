import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Share2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchShares, revokeShare } from '../../store/sharesSlice';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchBar from '../../components/ui/SearchBar';
import SortFilterBar from '../../components/ui/SortFilterBar';
import Pagination from '../../components/ui/Pagination';
import ShareDetailModal from '../../components/ui/ShareDetailModal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useSearch } from '../../hooks/useSearch';
import { usePagination } from '../../hooks/usePagination';
import { useSortFilter, SHARE_SORT_OPTIONS, SHARE_FILTER_OPTIONS } from '../../hooks/useSortFilter';
import { formatDateTime, formatTimeRemaining } from '../../utils/formatters';
import { extractErrorMessage } from '../../utils/errors';

const PAGE_SIZE = 5;

export default function Shares() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((s) => s.shares);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [isRevoking,   setIsRevoking]   = useState(false);
  const [selectedShare, setSelectedShare] = useState(null);

  useEffect(() => { if (status === 'idle') dispatch(fetchShares()); }, [dispatch, status]);

  const { sortKey, setSortKey, filterKey, setFilterKey, processed } =
    useSortFilter(items, SHARE_SORT_OPTIONS, SHARE_FILTER_OPTIONS, 'date_desc');
  const { query, setQuery, filtered, hasQuery } = useSearch(processed, ['file_name', 'shared_with_email']);
  const { page, setPage, totalPages, paged, from, to, totalItems } = usePagination(filtered, PAGE_SIZE);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try { 
      await dispatch(revokeShare(revokeTarget.id)).unwrap();
      toast.success('Share revoked.');
      setSelectedShare(null);
    } catch (err) { toast.error(extractErrorMessage({ response: { data: err } })); }
    finally { setIsRevoking(false); setRevokeTarget(null); }
  };

   const handleModalRevoke = async () => {
    if (!selectedShare) return;
    setIsRevoking(true);
    try {
      await dispatch(revokeShare(selectedShare.id)).unwrap();
      toast.success('Share revoked.');
    } catch (err) { toast.error(extractErrorMessage({ response: { data: err } })); }
    finally { setIsRevoking(false); setSelectedShare(null); }
  };
 
  const shareUrl = (token) => `${window.location.origin}/shared/${token}`;
 
  return (
    <div className="h-full flex flex-col gap-6 md:gap-8">
      <div className='mt-3 md:mt-0'>
        <h1 className="pt-2 pl-2 font-display font-bold text-text-primary text-2xl">shares</h1>
        <p className="pt-2 pl-2 text-text-muted text-xs md:text-sm">{items.length} share link{items.length !== 1 ? 's' : ''}</p>
      </div>
 
      {(items.length > 0 || hasQuery) && (
        <div className="flex flex-col items-center justify-center gap-3 animate-fade-in">
          <SearchBar query={query} setQuery={setQuery} placeholder="Search by file name…" className="md:w-[400px]" />
          <SortFilterBar
            sortOptions={SHARE_SORT_OPTIONS} sortKey={sortKey} setSortKey={setSortKey}
            filterOptions={SHARE_FILTER_OPTIONS} filterKey={filterKey} setFilterKey={setFilterKey}
          />
        </div>
      )}

      <div className="overflow-hidden animate-slide-up">

        {status === 'loading' && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-24" />
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
            <p className="text-text-primary text-sm font-medium">No share links yet</p>
            <p className="text-text-muted text-xs">Share a file from My Files to see links here.</p>
          </div>
        )}

        {status === 'succeeded' && items.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-text-muted text-sm">No shares match your filters.</p>
            <button onClick={() => { setQuery(''); setFilterKey('all'); }} className="text-accent text-xs hover:underline">Clear filters</button>
          </div>
        )}

        {status === 'succeeded' && paged.map((share) => (
          <div 
            key={share.id} 
            className="grid grid-cols-[3fr_0.5fr_0.5fr_0.5fr] md:grid-cols-[3fr_1fr_0.5fr_0.5fr_0.5fr]
            gap-3 px-4 py-3.5 border-b border-border last:border-0 hover:bg-elevated/20 
            transition-colors hover:cursor-pointer"
            onClick={() => setSelectedShare(share)}
          >
            <div className="flex items-center justify-between gap-3 min-w-0">
              <p className="text-text-primary text-sm truncate">{share.file_name}</p>
            </div>
            <p className="hidden self-center md:block text-text-muted text-xs truncate">{share.shared_with_email || '—'}</p>
            <span className="text-text-muted text-xs self-center text-center">{formatTimeRemaining(share.expires_at)}</span>
            {share.first_viewed_at ? (
              <span className="flex items-center gap-1 text-blue-500 text-xs text-center flex-shrink-0">
                <Eye size={10} />
                Seen
              </span>
            ) : (
              <span className="flex items-center text-text-muted text-xs flex-shrink-0 gap-1">
                <EyeOff size={10} />
                -
              </span>
            )}
            <div className="flex items-center justify-end"><Badge status={share.status}/></div>
          </div>
        ))}

        {status === 'succeeded' && filtered.length > 0 && (
          <Pagination page={page} setPage={setPage} totalPages={totalPages} from={from} to={to} totalItems={totalItems} />
        )}
      </div>

      {/* Share detail modal */}
      {selectedShare && (
        <ShareDetailModal
          share={selectedShare}
          shareUrl={shareUrl}
          onClose={() => setSelectedShare(null)}
          onRevoke={handleModalRevoke}
          isRevoking={isRevoking}
        />
      )}

      <ConfirmDialog
        isOpen={!!revokeTarget} onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke} isLoading={isRevoking}
        title="Revoke share?"
        message={`The share link for "${revokeTarget?.file_name}" will be permanently deactivated.`}
        confirmLabel="Revoke"
      />
    </div>
  );
}

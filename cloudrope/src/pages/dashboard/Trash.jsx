import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Trash2, RotateCcw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchTrash, restoreFile, permanentDeleteFile } from '../../store/trashSlice';
import { fetchFiles } from '../../store/filesSlice';
import { FileRowSkeleton } from '../../components/ui/Skeleton';
import FileIcon from '../../components/ui/FileIcon';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';
import { useSearch } from '../../hooks/useSearch';
import { usePagination } from '../../hooks/usePagination';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage } from '../../utils/errors';

const PAGE_SIZE = 10;

export default function Trash() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((s) => s.trash);

  const [restoreTarget, setRestoreTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchTrash());
  }, [dispatch, status]);

  const sorted = [...items].sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
  const { query, setQuery, filtered, hasQuery } = useSearch(sorted, ['original_name']);
  const { page, setPage, totalPages, paged, from, to, totalItems } = usePagination(filtered, PAGE_SIZE);

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setIsActionLoading(true);
    try {
      await dispatch(restoreFile(restoreTarget.id)).unwrap();
      dispatch(fetchFiles());
      toast.success('File restored successfully.');
    } catch (err) {
      toast.error(extractErrorMessage({ response: { data: err } }));
    } finally {
      setIsActionLoading(false);
      setRestoreTarget(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setIsActionLoading(true);
    try {
      await dispatch(permanentDeleteFile(deleteTarget.id)).unwrap();
      toast.success('File permanently deleted.');
    } catch (err) {
      toast.error(extractErrorMessage({ response: { data: err } }));
    } finally {
      setIsActionLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="mb-5">
        <h1 className="font-display font-bold text-text-primary text-2xl">Trash</h1>
        <p className="text-text-muted text-sm mt-0.5">{items.length} deleted file{items.length !== 1 ? 's' : ''}</p>
      </div>

      {(items.length > 0 || hasQuery) && (
        <div className="mb-4">
          <SearchBar query={query} setQuery={setQuery} placeholder="Search trash…" className="max-w-xs" />
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_100px_140px_112px] items-center px-4 py-2.5 border-b border-border bg-elevated/40">
          <span className="text-text-muted text-xs font-medium">Name</span>
          <span className="text-text-muted text-xs font-medium">Size</span>
          <span className="text-text-muted text-xs font-medium">Deleted</span>
          <span className="text-text-muted text-xs font-medium text-right">Actions</span>
        </div>

        {status === 'loading' && Array.from({ length: 3 }).map((_, i) => <FileRowSkeleton key={i} />)}

        {status === 'failed' && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <AlertCircle size={24} className="text-error" />
            <p className="text-text-muted text-sm">Failed to load trash.</p>
          </div>
        )}

        {status === 'succeeded' && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-12 h-12 bg-elevated rounded-xl flex items-center justify-center">
              <Trash2 size={20} className="text-text-muted" />
            </div>
            <div>
              <p className="text-text-primary text-sm font-medium">Trash is empty</p>
              <p className="text-text-muted text-xs mt-0.5">Deleted files will appear here.</p>
            </div>
          </div>
        )}

        {status === 'succeeded' && items.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-text-muted text-sm">No files match "<span className="text-text-primary">{query}</span>"</p>
            <button onClick={() => setQuery('')} className="text-accent text-xs hover:underline">Clear search</button>
          </div>
        )}

        {status === 'succeeded' && paged.map((file) => (
          <div
            key={file.id}
            className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_140px_112px] items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 hover:bg-elevated/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileIcon mimeType={file.mime_type} />
              <div className="min-w-0">
                <p className="text-text-primary text-sm font-medium truncate">{file.original_name}</p>
                <p className="text-text-muted text-xs md:hidden">{file.size_display} · Deleted {formatDate(file.deleted_at)}</p>
              </div>
            </div>
            <span className="hidden md:block text-text-muted text-xs">{file.size_display}</span>
            <span className="hidden md:block text-text-muted text-xs">{formatDateTime(file.deleted_at)}</span>
            <div className="flex items-center gap-1 justify-end">
              <button
                className="p-1.5 rounded-md text-text-muted hover:text-success hover:bg-success/10 transition-colors"
                title="Restore"
                onClick={() => setRestoreTarget(file)}
              >
                <RotateCcw size={14} />
              </button>
              <button
                className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                title="Permanently delete"
                onClick={() => setDeleteTarget(file)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {status === 'succeeded' && filtered.length > 0 && (
          <Pagination page={page} setPage={setPage} totalPages={totalPages} from={from} to={to} totalItems={totalItems} />
        )}
      </div>

      <ConfirmDialog
        isOpen={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onConfirm={handleRestore}
        isLoading={isActionLoading}
        title="Restore file?"
        message={`"${restoreTarget?.original_name}" will be moved back to My Files.`}
        confirmLabel="Restore"
        danger={false}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handlePermanentDelete}
        isLoading={isActionLoading}
        title="Permanently delete?"
        message={`"${deleteTarget?.original_name}" will be permanently destroyed. This cannot be undone.`}
        confirmLabel="Delete forever"
      />
    </div>
  );
}

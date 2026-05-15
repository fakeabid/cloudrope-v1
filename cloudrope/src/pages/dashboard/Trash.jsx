import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Trash2, RotateCcw, AlertCircle, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchTrash, restoreFile, permanentDeleteFile } from '../../store/trashSlice';
import { fetchFiles } from '../../store/filesSlice';
import { FileRowSkeleton } from '../../components/ui/Skeleton';
import FileIcon from '../../components/ui/FileIcon';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchBar from '../../components/ui/SearchBar';
import SortFilterBar from '../../components/ui/SortFilterBar';
import Pagination from '../../components/ui/Pagination';
import { useSearch } from '../../hooks/useSearch';
import { usePagination } from '../../hooks/usePagination';
import { useSortFilter, TRASH_SORT_OPTIONS, FILE_FILTER_OPTIONS } from '../../hooks/useSortFilter';
import { formatDateTime } from '../../utils/formatters';
import { extractErrorMessage } from '../../utils/errors';

const PAGE_SIZE = 5;

function SelectCircle({ selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
        selected
          ? 'bg-accent border-accent shadow-sm'
          : 'border-border hover:border-accent bg-white'
      }`}
    >
      {selected && <Check size={13} className="text-white" strokeWidth={3} />}
    </button>
  );
}

export default function Trash() {
  const dispatch = useDispatch();
  const { items, status } = useSelector((s) => s.trash);

  const [restoreTarget, setRestoreTarget]     = useState(null);
  const [deleteTarget,  setDeleteTarget]      = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmBulkRestore, setConfirmBulkRestore] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  useEffect(() => { 
    if (status === 'idle') dispatch(fetchTrash()); 
  }, [dispatch, status]);

  const { sortKey, setSortKey, filterKey, setFilterKey, processed } =
    useSortFilter(items, TRASH_SORT_OPTIONS, FILE_FILTER_OPTIONS, 'date_desc');
  const { query, setQuery, filtered, hasQuery } = useSearch(processed, ['original_name']);
  const { page, setPage, totalPages, paged, from, to, totalItems } = usePagination(filtered, PAGE_SIZE);

  // ── Select Mode Helpers ──
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedFiles = items.filter(f => selectedIds.has(f.id));
  const n = selectedIds.size;

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setIsActionLoading(true);
    try {
      await dispatch(restoreFile(restoreTarget.id)).unwrap();
      dispatch(fetchFiles());
      toast.success('File restored successfully.');
    } catch (err) { toast.error(extractErrorMessage({ response: { data: err } })); }
    finally { setIsActionLoading(false); setRestoreTarget(null); }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setIsActionLoading(true);
    try {
      await dispatch(permanentDeleteFile(deleteTarget.id)).unwrap();
      toast.success('File permanently deleted.');
    } catch (err) { toast.error(extractErrorMessage({ response: { data: err } })); }
    finally { setIsActionLoading(false); setDeleteTarget(null); }
  };

  const handleBulkRestore = async () => {
    setIsBulkLoading(true);
    let failed = 0;
    for (const file of selectedFiles) {
      try { await dispatch(restoreFile(file.id)).unwrap(); }
      catch { failed++; }
    }
    dispatch(fetchFiles());
    setIsBulkLoading(false);
    setConfirmBulkRestore(false);
    exitSelectMode();
    failed > 0
      ? toast.error(`${failed} files couldn't be restored.`)
      : toast.success(`${n} items restored to My Files.`);
  };

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    let failed = 0;
    for (const file of selectedFiles) {
      try { await dispatch(permanentDeleteFile(file.id)).unwrap(); }
      catch { failed++; }
    }
    setIsBulkLoading(false);
    setConfirmBulkDelete(false);
    exitSelectMode();
    failed > 0
      ? toast.error(`${failed} files couldn't be deleted.`)
      : toast.success(`${n} items permanently deleted.`);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="mt-3 md:mt-0">
          <h1 className="pt-2 pl-2 font-display font-bold text-text-primary text-2xl">trash</h1>
          <p className="pt-2 pl-2 text-text-muted text-xs md:text-sm">
            {items.length} deleted file{items.length !== 1 ? 's' : ''}
            {selectMode && n > 0 && (
              <span className="text-accent font-medium ml-1">· {n} selected</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <button
                onClick={() => setConfirmBulkRestore(true)}
                disabled={n === 0 || isBulkLoading}
                className="btn-primary rounded-full"
                title="Restore selected"
              >
                <RotateCcw size={13} />
              </button>
              <button
                onClick={() => setConfirmBulkDelete(true)}
                disabled={n === 0 || isBulkLoading}
                className="btn-danger rounded-full"
                title="Delete forever selected"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={exitSelectMode}
                disabled={isBulkLoading}
                className="btn-secondary rounded-full"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              className="btn-secondary rounded-full p-3 text-xs md:text-sm"
              onClick={() => setSelectMode(true)}
              disabled={items.length === 0}
            >
              select
            </button>
          )}
        </div>
      </div>

      {(items.length > 0 || hasQuery) && (
        <div className="flex flex-col items-center justify-center gap-3 animate-fade-in">
          <SearchBar query={query} setQuery={setQuery} placeholder="Search trash…" className="md:w-[400px]" />
          <SortFilterBar
            sortOptions={TRASH_SORT_OPTIONS} sortKey={sortKey} setSortKey={setSortKey}
            filterOptions={FILE_FILTER_OPTIONS} filterKey={filterKey} setFilterKey={setFilterKey}
          />
        </div>
      )}

      <div className="animate-slide-up">

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
            <p className="text-text-primary text-sm font-medium">Trash is empty</p>
            <p className="text-text-muted text-xs">Deleted files will appear here.</p>
          </div>
        )}

        {status === 'succeeded' && items.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-text-muted text-sm">No files match your filters.</p>
            <button onClick={() => { setQuery(''); setFilterKey('all'); }} className="text-accent text-xs hover:underline">Clear filters</button>
          </div>
        )}

        {status === 'succeeded' && paged.map((file) => {
          const isSelected = selectedIds.has(file.id);

          return (
            <div 
              key={file.id} 
              onClick={selectMode ? () => toggleSelect(file.id) : undefined}
              className={`grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_160px_112px] items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 transition-colors ${
                selectMode
                  ? `cursor-pointer ${isSelected ? 'bg-accent/5' : 'hover:bg-elevated/40'}`
                  : 'hover:bg-elevated/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {selectMode ? (
                  <SelectCircle
                    selected={isSelected}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                  />
                ) : (
                  <FileIcon mimeType={file.mime_type} />
                )}
                <div className="min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{file.original_name}</p>
                  <p className="text-text-muted text-xs md:hidden">{file.size_display}</p>
                </div>
              </div>
              <span className="hidden md:block text-text-muted text-xs">{file.size_display}</span>
              <span className="hidden md:block text-text-muted text-xs">{formatDateTime(file.deleted_at)}</span>
              {!selectMode ? (
                <div className="flex items-center gap-1 justify-end">
                  <button className="p-1.5 rounded-md text-text-muted hover:text-success hover:bg-success/10 transition-colors" title="Restore" onClick={() => setRestoreTarget(file)}>
                    <RotateCcw size={14} />
                  </button>
                  <button className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors" title="Delete forever" onClick={() => setDeleteTarget(file)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex justify-end text-text-muted">-</div>
              )}
            </div>
          )
        })}

        {status === 'succeeded' && filtered.length > 0 && (
          <Pagination page={page} setPage={setPage} totalPages={totalPages} from={from} to={to} totalItems={totalItems} />
        )}
      </div>

      <ConfirmDialog isOpen={!!restoreTarget} onClose={() => setRestoreTarget(null)} onConfirm={handleRestore} isLoading={isActionLoading} title="Restore file?" message={`"${restoreTarget?.original_name}" will be moved back to My Files.`} confirmLabel="Restore" danger={false} />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handlePermanentDelete} isLoading={isActionLoading} title="Permanently delete?" message={`"${deleteTarget?.original_name}" will be destroyed forever. This cannot be undone.`} confirmLabel="Delete forever" />
    
      {/* ── Bulk Action Dialogs ── */}
      <ConfirmDialog
        isOpen={confirmBulkRestore} onClose={() => setConfirmBulkRestore(false)}
        onConfirm={handleBulkRestore} isLoading={isBulkLoading}
        title={`Restore ${n} files?`}
        message={`${n} selected items will be moved back to My Files.`}
        confirmLabel="Restore"
        danger={false}
      />
      <ConfirmDialog
        isOpen={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete} isLoading={isBulkLoading}
        title={`Permanently delete ${n} files?`}
        message={`${n} selected items will be destroyed forever. This action is irreversible.`}
        confirmLabel="Delete forever"
      />
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Upload, Download, Share2, Trash2, Files, AlertCircle, CloudUpload } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchFiles, deleteFile } from '../../store/filesSlice';
import { fetchTrash } from '../../store/trashSlice';
import { fetchShares } from '../../store/sharesSlice';
import { FileRowSkeleton } from '../../components/ui/Skeleton';
import FileIcon from '../../components/ui/FileIcon';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ShareModal from '../../components/ui/ShareModal';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';
import UploadQueueTray from '../../components/ui/UploadQueueTray';
import { useUploadQueue } from '../../hooks/useUploadQueue';
import { useSearch } from '../../hooks/useSearch';
import { usePagination } from '../../hooks/usePagination';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage } from '../../utils/errors';
import { downloadFile } from '../../utils/download';

const ALLOWED_ACCEPT = '.jpg,.jpeg,.png,.pdf,.txt';
const PAGE_SIZE = 10;

export default function MyFiles() {
  const dispatch = useDispatch();
  const { items: files, status } = useSelector((s) => s.files);
  const fileInputRef = useRef(null);

  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [shareTarget, setShareTarget]     = useState(null);
  const [isDragging, setIsDragging]       = useState(false);
  const dragCounter                        = useRef(0);

  const { queue, enqueue, clearDone, retryItem, removeItem, isActive, doneCount, errorCount } = useUploadQueue();
  const sortedFiles = [...files].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  const { query, setQuery, filtered, hasQuery } = useSearch(sortedFiles, ['original_name']);
  const { page, setPage, totalPages, paged, from, to, totalItems } = usePagination(filtered, PAGE_SIZE);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchFiles());
  }, [dispatch, status]);

  // ── File input change (also handles multi-select) ──────────────────────────
  const handleFileChange = (e) => {
    if (!e.target.files?.length) return;
    const { rejected } = enqueue(e.target.files);
    rejected.forEach(({ name, reason }) => toast.error(`${name}: ${reason}`));
    fileInputRef.current.value = '';
  };

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
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
  }, [enqueue]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteFile(deleteTarget.id)).unwrap();
      dispatch(fetchTrash());
      dispatch(fetchShares()); // backend revokes all active shares on delete
      toast.success('File moved to trash.');
    } catch (err) {
      toast.error(extractErrorMessage({ response: { data: err } }));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div
      className="p-6 md:p-8 max-w-5xl relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Drag overlay ── */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-accent rounded-2xl px-16 py-12 flex flex-col items-center gap-3 bg-accent/5 animate-fade-in">
            <CloudUpload size={36} className="text-accent" />
            <p className="font-display font-semibold text-text-primary text-lg">Drop files here</p>
            <p className="text-text-muted text-sm">JPEG, PNG, PDF, TXT · max 10 MB each</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display font-bold text-text-primary text-2xl">My Files</h1>
          <p className="text-text-muted text-sm mt-0.5">{files.length} file{files.length !== 1 ? 's' : ''}</p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_ACCEPT}
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} />
            Upload files
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      {(files.length > 0 || hasQuery) && (
        <div className="mb-4">
          <SearchBar
            query={query}
            setQuery={setQuery}
            placeholder="Search files…"
            className="max-w-xs"
          />
        </div>
      )}

      {/* ── File list ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {/* Column header */}
        <div className="hidden md:grid grid-cols-[1fr_100px_120px_112px] items-center px-4 py-2.5 border-b border-border bg-elevated/40">
          <span className="text-text-muted text-xs font-medium">Name</span>
          <span className="text-text-muted text-xs font-medium">Size</span>
          <span className="text-text-muted text-xs font-medium">Uploaded</span>
          <span className="text-text-muted text-xs font-medium text-right">Actions</span>
        </div>

        {status === 'loading' && Array.from({ length: 4 }).map((_, i) => <FileRowSkeleton key={i} />)}

        {status === 'failed' && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <AlertCircle size={24} className="text-error" />
            <p className="text-text-muted text-sm">Failed to load files. Try refreshing.</p>
          </div>
        )}

        {status === 'succeeded' && files.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-12 h-12 bg-elevated rounded-xl flex items-center justify-center">
              <Files size={20} className="text-text-muted" />
            </div>
            <div>
              <p className="text-text-primary text-sm font-medium">No files yet</p>
              <p className="text-text-muted text-xs mt-0.5">Upload a file or drag and drop here.</p>
            </div>
            <button className="btn-primary mt-1" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} />
              Upload files
            </button>
          </div>
        )}

        {status === 'succeeded' && files.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-text-muted text-sm">No files match "<span className="text-text-primary">{query}</span>"</p>
            <button onClick={() => setQuery('')} className="text-accent text-xs hover:underline">Clear search</button>
          </div>
        )}

        {status === 'succeeded' && paged.map((file) => (
          <div
            key={file.id}
            className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_100px_120px_112px] items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 hover:bg-elevated/30 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileIcon mimeType={file.mime_type} />
              <div className="min-w-0">
                <p className="text-text-primary text-sm font-medium truncate">{file.original_name}</p>
                <p className="text-text-muted text-xs md:hidden">{file.size_display} · {formatDate(file.uploaded_at)}</p>
              </div>
            </div>
            <span className="hidden md:block text-text-muted text-xs">{file.size_display}</span>
            <span className="hidden md:block text-text-muted text-xs">{formatDate(file.uploaded_at)}</span>
            <div className="flex items-center gap-1 justify-end">
              <button
                className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                title="Download"
                onClick={() => downloadFile(file.id, file.original_name)}
              >
                <Download size={14} />
              </button>
              <button
                className="p-1.5 rounded-md text-text-muted hover:text-success hover:bg-success/10 transition-colors"
                title="Share"
                onClick={() => setShareTarget(file)}
              >
                <Share2 size={14} />
              </button>
              <button
                className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                title="Delete"
                onClick={() => setDeleteTarget(file)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* ── Pagination ── */}
        {status === 'succeeded' && filtered.length > 0 && (
          <Pagination
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            from={from}
            to={to}
            totalItems={totalItems}
          />
        )}
      </div>

      {/* ── Dialogs ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Move to trash?"
        message={`"${deleteTarget?.original_name}" will be moved to trash. You can restore it from the Trash page.`}
        confirmLabel="Move to trash"
      />

      {shareTarget && (
        <ShareModal
          file={shareTarget}
          isOpen={!!shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* ── Upload queue tray (fixed bottom-right) ── */}
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

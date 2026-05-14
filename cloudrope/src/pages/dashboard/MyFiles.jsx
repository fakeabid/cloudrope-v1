import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Download, Share2, Trash2, Files, Star, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchFiles, deleteFile, toggleFavorite } from '../../store/filesSlice';
import { fetchTrash } from '../../store/trashSlice';
import { fetchShares } from '../../store/sharesSlice';
import { FileRowSkeleton } from '../../components/ui/Skeleton';
import FileIcon from '../../components/ui/FileIcon';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ShareModal from '../../components/ui/ShareModal';
import FileDetailModal from '../../components/ui/FileDetailModal';
import SearchBar from '../../components/ui/SearchBar';
import SortFilterBar from '../../components/ui/SortFilterBar';
import Pagination from '../../components/ui/Pagination';
import { useSearch } from '../../hooks/useSearch';
import { usePagination } from '../../hooks/usePagination';
import { useSortFilter, FILE_SORT_OPTIONS, FILE_FILTER_OPTIONS } from '../../hooks/useSortFilter';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage } from '../../utils/errors';
import { downloadFile } from '../../utils/download';
import { filesAPI } from '../../api/files';
import { useNavigate, useOutletContext } from 'react-router-dom';

const ALLOWED_ACCEPT = '.jpg,.jpeg,.png,.pdf,.txt';
const PAGE_SIZE = 5;

// ── Small circle checkbox used in select mode ─────────────────────────────────
function SelectCircle({ selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
        selected
          ? 'bg-accent border-accent shadow-sm'
          : 'border-border hover:border-accent bg-white/80 backdrop-blur-sm'
      }`}
    >
      {selected && <Check size={13} className="text-white" strokeWidth={3} />}
    </button>
  );
}

export default function MyFiles() {
  const dispatch    = useDispatch();
  const { items: files, status } = useSelector((s) => s.files);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { stageFiles } = useOutletContext();

  // ── Normal mode ──
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting,   setIsDeleting]   = useState(false);
  const [shareTarget,  setShareTarget]  = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // ── Select mode ──
  const [selectMode,       setSelectMode]       = useState(false);
  const [selectedIds,      setSelectedIds]       = useState(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [isBulkDeleting,   setIsBulkDeleting]    = useState(false);
  const [isPreparingShare, setIsPreparingShare]  = useState(false);
  const [bulkStagedFiles,  setBulkStagedFiles]   = useState(null); // [{id, file}] for ShareModal

  const { sortKey, setSortKey, filterKey, setFilterKey, processed } =
    useSortFilter(files, FILE_SORT_OPTIONS, FILE_FILTER_OPTIONS, 'date_desc');
  const { query, setQuery, filtered, hasQuery } = useSearch(processed, ['original_name']);
  const { page, setPage, totalPages, paged, from, to, totalItems } = usePagination(filtered, PAGE_SIZE);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchFiles());
  }, [dispatch, status]);

  // ── Select mode helpers ───────────────────────────────────────────────────
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

  const selectedFiles = files.filter(f => selectedIds.has(f.id));
  const n = selectedIds.size;

  // ── Normal upload ─────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    if (!e.target.files?.length) return;
    stageFiles(e.target.files);
    navigate('/dashboard');
    fileInputRef.current.value = '';
  };

  // ── Single file delete ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteFile(deleteTarget.id)).unwrap();
      dispatch(fetchTrash());
      dispatch(fetchShares());
      toast.success('File moved to trash.');
    } catch (err) {
      toast.error(extractErrorMessage({ response: { data: err } }));
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    let failed = 0;
    for (const file of selectedFiles) {
      try { await dispatch(deleteFile(file.id)).unwrap(); }
      catch { failed++; }
    }
    await dispatch(fetchTrash());
    await dispatch(fetchShares());
    setIsBulkDeleting(false);
    setConfirmBulkDelete(false);
    exitSelectMode();
    failed > 0
      ? toast.error(`${failed} file${failed > 1 ? 's' : ''} couldn't be deleted.`)
      : toast.success(`${n} file${n > 1 ? 's' : ''} moved to trash.`);
  };

  // ── Bulk share ────────────────────────────────────────────────────────────
  // Download selected files as blobs → pass to ShareModal as stagedFiles.
  // ShareModal already knows how to zip multiple files, upload, and share.
  const handleBulkShare = async () => {
    if (selectedFiles.length === 0 || isPreparingShare) return;

    if (selectedFiles.length === 1) {
      setShareTarget(selectedFiles[0]);
      return;
    }
    
    setIsPreparingShare(true);
    try {
      const blobItems = await Promise.all(
        selectedFiles.map(async (file) => {
          const { data: blob } = await filesAPI.downloadBlob(file.id);
          return {
            id: file.id,
            file: new File([blob], file.original_name, { type: file.mime_type }),
          };
        })
      );
      setBulkStagedFiles(blobItems);
    } catch {
      toast.error('Failed to download files. Try again.');
    } finally {
      setIsPreparingShare(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 md:gap-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="mt-3 md:mt-0">
          <h1 className="pt-2 pl-2 font-display font-bold text-text-primary text-2xl">files</h1>
          <p className="pt-2 pl-2 text-text-muted text-xs md:text-sm">
            {files.length} file{files.length !== 1 ? 's' : ''}
            {selectMode && n > 0 && (
              <span className="text-accent font-medium ml-1">· {n} selected</span>
            )}
          </p>
        </div> 

        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              <button
                onClick={() => setConfirmBulkDelete(true)}
                disabled={n === 0 || isBulkDeleting || isPreparingShare}
                className="btn-danger rounded-full"
              >
                <Trash2 size={13} />
              </button>

              <button
                onClick={handleBulkShare}
                disabled={n === 0 || isPreparingShare || isBulkDeleting}
                className="btn-primary rounded-full"
              >
                {isPreparingShare ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </>
                ) : (
                  <>
                    <Share2 size={13} />
                  </>
                )}
              </button>

              <button
                onClick={exitSelectMode}
                disabled={isPreparingShare || isBulkDeleting}
                className="btn-secondary rounded-full"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-secondary rounded-full p-3 text-xs md:text-sm"
                onClick={() => setSelectMode(true)}
                disabled={files.length === 0}
              >
                select
              </button>
              <input
                ref={fileInputRef} type="file"
                accept={ALLOWED_ACCEPT} multiple
                className="hidden" onChange={handleFileChange}
              />
              <button className="btn-primary rounded-full hidden md:block" onClick={() => fileInputRef.current?.click()}>
                +
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Search + filter ── */}
      {(files.length > 0 || hasQuery) && (
        <div className="flex flex-col items-center justify-center gap-3 animate-fade-in">
          <SearchBar query={query} setQuery={setQuery} placeholder="Search files…" className="md:w-[400px]" />
          <SortFilterBar
            sortOptions={FILE_SORT_OPTIONS} sortKey={sortKey} setSortKey={setSortKey}
            filterOptions={FILE_FILTER_OPTIONS} filterKey={filterKey} setFilterKey={setFilterKey}
          />
        </div>
      )}

      {/* ── File table ── */}
      <div className="overflow-auto animate-slide-up">

        {status === 'loading' && Array.from({ length: 4 }).map((_, i) => <FileRowSkeleton key={i} />)}

        {status === 'succeeded' && files.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-12 h-12 bg-elevated rounded-xl flex items-center justify-center">
              <Files size={20} className="text-text-muted" />
            </div>
            <div>
              <p className="text-text-primary text-sm font-medium">No files yet</p>
            </div>
            <button className="btn-primary mt-1 rounded-full" onClick={() => fileInputRef.current?.click()}>
              + upload
            </button>
          </div>
        )}

        {status === 'succeeded' && files.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-text-muted text-sm">No files match "<span className="text-text-primary">{query || filterKey}</span>"</p>
            <button onClick={() => { setQuery(''); setFilterKey('all'); }} className="text-accent text-xs hover:underline">Clear filters</button>
          </div>
        )}

        {status === 'succeeded' && paged.map((file) => {
          const isFav      = file.is_favorite;;
          const isSelected = selectedIds.has(file.id);

          return (
            <div
              key={file.id}
              onClick={
                selectMode
                  ? () => toggleSelect(file.id)
                  : () => setSelectedFile(file)
              }
              className={`grid grid-cols-[1fr_auto] md:grid-cols-[1fr_60px_178px_80px] items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 transition-colors hover:cursor-pointer ${
                selectMode
                  ? `${isSelected ? 'bg-accent/5' : 'hover:bg-elevated/40'}`
                  : 'hover:bg-elevated/30'
              }`}
            >
              {/* Name + icon / circle */}
              <div className="flex items-center gap-3 min-w-0">
                {selectMode ? (
                  <SelectCircle
                    selected={isSelected}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                  />
                ) : (
                  <FileIcon mimeType={file.mime_type} />
                )}
                <div className="min-w-0 flex flex-col gap-2">
                  <p className="text-text-primary text-sm truncate">{file.original_name}</p>
                  <p className="text-text-muted text-xs md:hidden">{file.size_display} · {formatDate(file.uploaded_at)}</p>
                </div>
              </div>

              <span className="hidden md:block text-text-muted text-xs">{file.size_display}</span>
              <span className="hidden md:block text-text-muted text-xs">Created {formatDateTime(file.uploaded_at)}</span>

              {/* Actions — hidden in select mode */}
              {!selectMode ? (
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(toggleFavorite(file.id));
                    }}
                    className={`p-1.5 rounded-md transition-colors ${isFav ? 'text-warning hover:bg-warning/10' : 'text-text-muted hover:text-warning hover:bg-warning/10'}`}
                    title={isFav ? 'Unpin' : 'Pin'}
                  >
                    <Star size={14} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(file.id, file.original_name);
                    }} 
                    className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors" 
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                </div>
              ) : (
                /* Mobile: show circle on right side too for easy tap */
                <div className="flex justify-end text-text-muted">
                  -
                </div>
              )}
            </div>
          );
        })}

        {status === 'succeeded' && filtered.length > 0 && (
          <Pagination page={page} setPage={setPage} totalPages={totalPages} from={from} to={to} totalItems={totalItems} />
        )}
      </div>

      {selectedFile && (
        <FileDetailModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDownload={() => {
            downloadFile(selectedFile.id, selectedFile.original_name);
          }}
          onShare={() => {
            setShareTarget(selectedFile);
            setSelectedFile(null);
          }}
          onDelete={() => {
            setDeleteTarget(selectedFile);
            setSelectedFile(null);
          }}
          onToggleFavorite={() => {
            dispatch(toggleFavorite(selectedFile.id));
          }}
        />
      )}

      {/* ── Single file dialogs ── */}
      <ConfirmDialog
        isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} isLoading={isDeleting}
        title="Move to trash?"
        message={`"${deleteTarget?.original_name}" will be moved to trash.`}
        confirmLabel="Move to trash"
      />
      {shareTarget && (
        <ShareModal 
          file={shareTarget} 
          isOpen={!!shareTarget} 
          onClose={() => {
            setShareTarget(null)
          }}
        />
      )}

      {/* ── Bulk delete confirm ── */}
      <ConfirmDialog
        isOpen={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete} isLoading={isBulkDeleting}
        title={`Move ${n} file${n !== 1 ? 's' : ''} to trash?`}
        message={`${n} selected file${n !== 1 ? 's' : ''} will be moved to trash and their active share links will be revoked.`}
        confirmLabel="Move to trash"
      />

      {/* ── Bulk share modal (reuses ShareModal's zip+upload+share flow) ── */}
      {bulkStagedFiles && (
        <ShareModal
          stagedFiles={bulkStagedFiles}
          isOpen={true}
          onClose={() => setBulkStagedFiles(null)}
          onShareSuccess={() => exitSelectMode()}
        />
      )}
    </div>
  );
}

import { useEffect, useRef } from 'react';
import {
  X,
  Download,
  Share2,
  Trash2,
  Calendar,
  HardDrive,
  Star,
  File,
  FileType,
} from 'lucide-react';

import FileIcon from './FileIcon';
import { formatDateTime } from '../../utils/formatters';

export default function FileDetailModal({
  file,
  onClose,
  onDownload,
  onShare,
  onDelete,
  onToggleFavorite,
}) {
  const overlayRef = useRef(null);

  // Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:justify-end bg-black/40 backdrop-blur-sm animate-fade-in"
    >
      <div className="
        relative
        w-full sm:max-w-lg md:max-w-md
        h-[80%] md:h-[90%]
        bg-surface border border-border
        rounded-t-2xl md:rounded-none md:rounded-l-2xl
        shadow-2xl overflow-hidden
        animate-slide-up md:animate-slide-in
      ">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">

            <div className="min-w-0">
              <p className="text-text-primary text-sm font-semibold truncate">
                File Details
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-elevated transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">

            <div className="col-span-2">
              <MetaItem
                icon={<File size={12} />}
                label="Name"
                value={file.original_name}
              />
            </div>

            <MetaItem
              icon={<FileType size={12} />}
              label="File Type"
              value={file.mime_type}
            />

            <MetaItem
              icon={<HardDrive size={12} />}
              label="Size"
              value={file.size_display}
            />

            <MetaItem
              icon={<Calendar size={12} />}
              label="Uploaded"
              value={formatDateTime(file.uploaded_at)}
            />

          </div>

        </div>
 
        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-center gap-4">

          <button
            onClick={onDownload}
            className="btn-secondary"
          >
            <Download size={14} />
          </button>

          <button
            onClick={onShare}
            className="btn-primary bg-accent/10 text-accent hover:bg-accent/20"
          >
            <Share2 size={14} />
          </button>

          <button
            onClick={onToggleFavorite}
            className={`btn-secondary ${file.is_favorite ? 'text-warning hover:bg-warning/10' : 'text-text-muted hover:text-warning hover:bg-warning/10'}`}
          >
            <Star
              size={14}
              fill={file.is_favorite ? 'currentColor' : 'none'}
            />
          </button>

          <button
            onClick={onDelete}
            className="btn-danger"
          >
            <Trash2 size={14} />
          </button>

        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon, label, value }) {
  return (
    <div className="flex flex-col gap-1 bg-elevated/50 rounded-lg px-3 py-2.5">
      <span className="text-text-muted text-xs flex items-center gap-1">
        {icon}
        {label}
      </span>

      <span className="text-text-primary text-xs font-medium">
        {value}
      </span>
    </div>
  );
}
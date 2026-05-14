import { useEffect, useRef } from 'react';
import { X, Link2, Calendar, Download, Clock, ExternalLink, Mail, Eye, EyeOff } from 'lucide-react';
import Badge from './Badge';
import CopyButton from './CopyButton';
import { formatDateTime } from '../../utils/formatters';

export default function ShareDetailModal({ share, shareUrl, onClose, onRevoke, isRevoking }) {
  const overlayRef = useRef(null);
 
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const url = shareUrl(share.token);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-0"
    >
      <div className="relative w-full sm:max-w-lg h-[80%] bg-surface border border-border rounded-t-2xl shadow-2xl animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-text-primary text-sm font-semibold truncate leading-snug">
              {share.file_name}
            </p>
            <div className="flex items-center gap-3">
              <Badge status={share.status} />
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

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetaItem
              icon={<Calendar size={12} />}
              label="Created"
              value={formatDateTime(share.created_at)}
            />
            <MetaItem
              icon={<Clock size={12} />}
              label="Expires"
              value={share.expires_at ? formatDateTime(share.expires_at) : 'Never'}
            />
            <MetaItem
              icon={<Download size={12} />}
              label="Downloads"
              value={
                share.max_downloads
                  ? `${share.download_count} of ${share.max_downloads}`
                  : `${share.download_count} (unlimited)`
              }
            />
            <MetaItem
              icon={<Eye size={12} />}
              label="Views"
              value={
                share.max_views
                  ? `${share.view_count} of ${share.max_views}`
                  : `${share.view_count} (unlimited)`
              }
            />

            {/* Recipient — full width */}
            <div className="col-span-2">
              <MetaItem
                icon={<Mail size={12} />}
                label="Recipient"
                value={share.shared_with_email || '—'}
              />
            </div>
            {/* First accessed — only when accessed link */}
            {share.first_accessed_at && (
              <div className="col-span-2">
                <MetaItem
                  icon={<Eye size={12} />}
                  label="Accessed at"
                  value={formatDateTime(share.first_accessed_at)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-center">
          {share.status === 'active' && (
            <button
              onClick={onRevoke}
              disabled={isRevoking}
              className="text-xs font-medium text-error border border-error/30 rounded-lg px-3 py-1.5 hover:bg-error/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRevoking ? 'Revoking…' : 'Revoke link'}
            </button>
          )}
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
      <span className="text-text-primary text-xs font-medium break-all">{value}</span>
    </div>
  );
}
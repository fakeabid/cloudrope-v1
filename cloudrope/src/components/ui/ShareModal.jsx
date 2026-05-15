import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, X, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { fetchFiles, shareFile } from '../../store/filesSlice';
import { fetchShares } from '../../store/sharesSlice';
import { extractErrorMessage } from '../../utils/errors';
import JSZip from 'jszip';
import { filesAPI } from '../../api/files';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ShareModal({ file, stagedFiles, isOpen, onClose, onShareSuccess }) {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();

  // Email chips
  const [emails,     setEmails]     = useState([]);
  const [input,      setInput]      = useState('');
  const [inputError, setInputError] = useState('');

  // Options
  const [optionsOpen,      setOptionsOpen]      = useState(false);
  const [expirationHours,  setExpirationHours]  = useState('');
  const [maxDownloads,     setMaxDownloads]      = useState('');
  const [maxViews,         setMaxViews]          = useState('');

  // State
  const [status,    setStatus]    = useState('idle'); // idle | uploading | sharing | success
  const [sentCount, setSentCount] = useState(0);

  const isStagingFlow = !!stagedFiles?.length;
  const fileName = isStagingFlow
    ? (stagedFiles.length === 1 ? stagedFiles[0].file.name : `${stagedFiles.length} files`)
    : file?.original_name;
  const fileDetail = isStagingFlow
    ? (stagedFiles.length === 1
        ? `${(stagedFiles[0].file.size / 1024).toFixed(1)} KB`
        : 'Will be bundled into a zip')
    : file?.size_display;

  // ── Email helpers ──────────────────────────────────────────────────────────
  const commitEmail = () => {
    const val = input.trim().toLowerCase();
    if (!val) return;
    if (!EMAIL_RE.test(val))   { setInputError('Invalid email'); return; }
    if (emails.includes(val))  { setInputError('Already added'); return; }
    setEmails(p => [...p, val]);
    setInput('');
    setInputError('');
  };

  const removeEmail = (e) => setEmails(p => p.filter(x => x !== e));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitEmail(); }
    if (e.key === 'Backspace' && !input && emails.length) {
      setEmails(p => p.slice(0, -1));
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!emails.length) { setInputError('Add at least one recipient'); return; }

    try {
      let targetFile = file;

      if (isStagingFlow) {
        setStatus('uploading');
        let blob, name;
        if (stagedFiles.length === 1) {
          blob = stagedFiles[0].file;
          name = blob.name;
        } else {
          const zip = new JSZip();
          stagedFiles.forEach(i => zip.file(i.file.name, i.file));
          blob = await zip.generateAsync({ type: 'blob' });
          name = 'cloudrope-share.zip';
        }
        const fd = new FormData();
        fd.append('file', new File([blob], name));
        const { data } = await filesAPI.upload(fd);
        targetFile = data;
      }

      setStatus('sharing');
      const options = { emails };
      if (expirationHours) options.expiration_hours = parseInt(expirationHours);
      if (maxDownloads)    options.max_downloads    = parseInt(maxDownloads);
      if (maxViews)        options.max_views        = parseInt(maxViews);

      await dispatch(shareFile({ id: targetFile.id, options })).unwrap();
      dispatch(fetchShares());
      dispatch(fetchFiles());

      setSentCount(emails.length);
      setStatus('success');
      if (onShareSuccess) onShareSuccess();

    } catch (err) {
      toast.error(extractErrorMessage({ response: { data: err } }) || 'Share failed');
      setStatus('idle');
    }
  };

  // ── Close / reset ──────────────────────────────────────────────────────────
  const handleClose = () => {
    setEmails([]); setInput(''); setInputError('');
    setExpirationHours(''); setMaxDownloads(''); setMaxViews('');
    setOptionsOpen(false); setStatus('idle'); setSentCount(0);
    onClose();
  };

  const isProcessing = status === 'uploading' || status === 'sharing';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={isProcessing ? undefined : handleClose} title="Share" size="md">

      {status !== 'success' ? (
        <div className="space-y-4">

          {/* File info */}
          <div className="flex items-center gap-3 bg-elevated rounded-xl px-3 py-2.5 border border-border">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Package size={15} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{fileName}</p>
              <p className="text-text-muted text-xs">{fileDetail}</p>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="label">Recipients</label>
            {/* Chip list + input */}
            <div
              className={`min-h-[42px] flex flex-wrap gap-1.5 items-center bg-elevated border rounded-xl px-3 py-2 transition-colors cursor-text ${
                inputError ? 'border-error' : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15'
              }`}
              onClick={() => document.getElementById('share-email-input')?.focus()}
            >
              {emails.map(e => (
                <span key={e} className="flex items-center gap-1 bg-accent/10 text-accent text-xs font-medium rounded-lg pl-2 pr-1 py-0.5">
                  {e}
                  <button
                    type="button"
                    onClick={() => removeEmail(e)}
                    className="hover:bg-accent/20 rounded p-0.5 transition-colors"
                    tabIndex={-1}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                id="share-email-input"
                type="email"
                value={input}
                onChange={e => { setInput(e.target.value); setInputError(''); }}
                onKeyDown={handleKeyDown}
                onBlur={commitEmail}
                placeholder={emails.length ? '' : 'name@example.com'}
                className="flex-1 min-w-[140px] bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
                disabled={isProcessing}
              />
              <button
                type="button"
                onClick={commitEmail}
                disabled={!input.trim() || isProcessing}
                className="flex-shrink-0 w-6 h-6 rounded-lg bg-accent disabled:bg-border flex items-center justify-center transition-colors"
              >
                <Plus size={12} className="text-white" />
              </button>
            </div>
            {inputError && <p className="text-error text-xs mt-1">{inputError}</p>}
            <p className="text-text-muted text-xs mt-1">Press Enter or comma to add · Backspace to remove last</p>
          </div>

          {/* Collapsible options */}
          <div className="border border-border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOptionsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-text-muted hover:text-text-primary hover:bg-elevated/50 transition-colors"
            >
              Options
              {optionsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {optionsOpen && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border bg-elevated/20">
                <div>
                  <label className="label">Expiry</label>
                  <select
                    className="input-field"
                    value={expirationHours}
                    onChange={e => setExpirationHours(e.target.value)}
                    disabled={isProcessing}
                  >
                    <option value="">No expiry</option>
                    <option value="1">1 hour</option>
                    <option value="24">24 hours</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Max downloads</label>
                    <input
                      type="number" min="1" max="10" placeholder="Unlimited"
                      className="input-field"
                      value={maxDownloads}
                      onChange={e => setMaxDownloads(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    <label className="label">Max views</label>
                    <input
                      type="number" min="1" max="20" placeholder="Unlimited"
                      className="input-field"
                      value={maxViews}
                      onChange={e => setMaxViews(e.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary flex-1 justify-center"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary flex-1 justify-center"
              onClick={handleSubmit}
              disabled={isProcessing || !emails.length}
            >
              {status === 'uploading' && (
                <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading…</>
              )}
              {status === 'sharing' && (
                <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sharing…</>
              )}
              {status === 'idle' && 'Share'}
            </button>
          </div>
        </div>

      ) : (
        /* Success state */
        <div className="space-y-5 animate-fade-up">
          <div className="flex flex-col items-center gap-2 py-2">
            <CheckCircle size={36} className="text-success" strokeWidth={1.5} />
            <p className="text-text-primary text-sm font-medium text-center">
              Shared with {sentCount} recipient{sentCount !== 1 ? 's' : ''}
            </p>
            <p className="text-text-muted text-xs text-center">
              Each person will receive an email with their unique link.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1 justify-center"
              onClick={handleClose}
            >
              Close
            </button>
            <button
              className="btn-primary flex-1 justify-center"
              onClick={() => { handleClose(); navigate('/dashboard/shares'); }}
            >
              View Shares
            </button>
          </div>
        </div>
      )}

    </Modal>
  );
}
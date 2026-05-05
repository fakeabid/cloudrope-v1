import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Link2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import CopyButton from '../ui/CopyButton';
import { shareFile } from '../../store/filesSlice';
import { extractErrorMessage } from '../../utils/errors';

export default function ShareModal({ file, isOpen, onClose }) {
  const dispatch = useDispatch();
  const [shareUrl, setShareUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { expiration_hours: '', max_downloads: '' },
  });

  const onSubmit = async (values) => {
    setIsLoading(true);
    const options = {};
    if (values.expiration_hours) options.expiration_hours = parseInt(values.expiration_hours);
    if (values.max_downloads) options.max_downloads = parseInt(values.max_downloads);

    try {
      const result = await dispatch(shareFile({ id: file.id, options })).unwrap();
      // Backend returns share_url pointing to itself; extract token and build
      // the frontend URL so users share the React page, not the raw API.
      const token = result.share_url.split('/').filter(Boolean).pop();
      const frontendUrl = `${window.location.origin}/shared/${token}`;
      setShareUrl(frontendUrl);
      toast.success('Share link created!');
    } catch (err) {
      toast.error(extractErrorMessage({ response: { data: err } }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Share file" size="md">
      {!shareUrl ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-elevated rounded-lg px-3 py-2.5 border border-border">
            <p className="text-text-primary text-sm font-medium truncate">{file?.original_name}</p>
            <p className="text-text-muted text-xs mt-0.5">{file?.size_display}</p>
          </div>

          <div>
            <label className="label">Expiry (optional)</label>
            <select
              className="input-field"
              {...register('expiration_hours')}
            >
              <option value="">No expiry</option>
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="48">2 days</option>
              <option value="72">3 days</option>
              <option value="168">7 days</option>
            </select>
          </div>

          <div>
            <label className="label">Max downloads (optional)</label>
            <input
              className="input-field"
              type="number"
              min="1"
              placeholder="Unlimited"
              {...register('max_downloads', {
                min: { value: 1, message: 'Must be at least 1' },
                validate: (v) => !v || Number.isInteger(Number(v)) || 'Must be a whole number',
              })}
            />
            {errors.max_downloads && <p className="text-error text-xs mt-1">{errors.max_downloads.message}</p>}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating…
                </span>
              ) : (
                <>
                  <Link2 size={14} />
                  Generate link
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-success/10 border border-success/30 rounded-lg px-4 py-3">
            <p className="text-success text-xs font-medium mb-1">Share link created</p>
            <p className="text-text-muted text-xs">Share this link with anyone. They don't need an account.</p>
          </div>

          <div>
            <label className="label">Share URL</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-elevated border border-border rounded-lg px-3 py-2 min-w-0">
                <p className="text-text-primary text-xs font-mono truncate">{shareUrl}</p>
              </div>
              <CopyButton text={shareUrl} />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button className="btn-secondary" onClick={handleClose}>Close</button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <ExternalLink size={13} />
              Preview
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
}

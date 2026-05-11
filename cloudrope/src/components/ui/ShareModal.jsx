import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Link, Link as LinkIcon, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import CopyButton from '../ui/CopyButton';
import { fetchFiles, shareFile } from '../../store/filesSlice';
import { fetchShares } from '../../store/sharesSlice';
import { extractErrorMessage } from '../../utils/errors';
import JSZip from 'jszip';
import { filesAPI } from '../../api/files';

export default function ShareModal({ file, stagedFiles, isOpen, onClose, onShareSuccess }) {
  const dispatch = useDispatch();
  const [shareUrl, setShareUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'sharing'

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { expiration_hours: '', max_downloads: '' },
  });

  // Helper to determine what to show in the UI box
  const isStagingFlow = !!stagedFiles && stagedFiles.length > 0;
  const fileName = isStagingFlow 
    ? (stagedFiles.length === 1 ? stagedFiles[0].file.name : `${stagedFiles.length} items to bundle`)
    : file?.original_name;
  
  const fileDetail = isStagingFlow
    ? (stagedFiles.length === 1 ? `${(stagedFiles[0].file.size / 1024).toFixed(1)} KB` : "Will be zipped")
    : file?.size_display;

  const onSubmit = async (values) => {
    try {
      let targetFile = file;

      // 1. UPLOAD STEP (Only if coming from staging)
      if (isStagingFlow) {
        setStatus('uploading');
        let uploadBlob;
        let finalName;

        if (stagedFiles.length === 1) {
          uploadBlob = stagedFiles[0].file;
          finalName = uploadBlob.name;
        } else {
          const zip = new JSZip();
          stagedFiles.forEach(item => zip.file(item.file.name, item.file));
          uploadBlob = await zip.generateAsync({ type: 'blob' });
          finalName = 'cloudrope-share.zip';
        }

        const formData = new FormData();
        formData.append('file', new File([uploadBlob], finalName));
        const { data } = await filesAPI.upload(formData);
        targetFile = data; 
      }

      // 2. SHARE STEP
      setStatus('sharing');
      const options = {};
      if (values.expiration_hours) options.expiration_hours = parseInt(values.expiration_hours);
      if (values.max_downloads) options.max_downloads = parseInt(values.max_downloads);

      const result = await dispatch(shareFile({ id: targetFile.id, options })).unwrap();
      
      const token = result.share_url.split('/').filter(Boolean).pop();
      setShareUrl(`${window.location.origin}/shared/${token}`);
      
      dispatch(fetchShares());
      dispatch(fetchFiles());
      toast.success('Share link created!');
      if (onShareSuccess) onShareSuccess();

    } catch (err) {
      console.error(err);
      toast.error(extractErrorMessage({ response: { data: err } }) || "Process failed");
    } finally {
      setStatus('idle');
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setStatus('idle');
    onClose();
  };

  const isProcessing = status !== 'idle';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Share files" size="md">
      {!shareUrl ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-elevated rounded-lg px-3 py-2.5 border border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Package size={16} className="text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{fileName || "Loading..."}</p>
              <p className="text-text-muted text-xs mt-0.5">{fileDetail}</p>
            </div>
          </div>

          <div>
            <label className="label">Expiry (optional)</label>
            <select className="input-field" {...register('expiration_hours')} disabled={isProcessing}>
              <option value="">No expiry</option>
              <option value="1">1 hour</option>
              <option value="24">24 hours</option>
              <option value="168">7 days</option>
            </select>
          </div>

          <div>
            <label className="label">Max downloads (optional)</label>
            <input
              className="input-field"
              type="number"
              placeholder="Unlimited"
              {...register('max_downloads')}
              disabled={isProcessing}
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={isProcessing}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isProcessing}>
              {status === 'uploading' ? 'Uploading...' : status === 'sharing' ? 'Finalizing...' : <><Link size={10} />Generate link</>}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {/* Success view (keep your original code here) */}
          <div className="bg-success/10 border border-success/30 rounded-lg px-4 py-3">
            <p className="text-success text-xs font-medium">Link ready to share!</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-elevated border border-border rounded-lg px-3 py-2 truncate text-xs">
              {shareUrl}
            </div>
            <CopyButton text={shareUrl} />
          </div>
        </div>
      )}
    </Modal>
  );
}
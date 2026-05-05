import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, CloudUpload, AlertCircle, Clock, Ban, CheckCircle } from 'lucide-react';
import { filesAPI } from '../api/files';
import FileIcon from '../components/ui/FileIcon';
import { formatFileSize, formatDateTime } from '../utils/formatters';

export default function SharedFile() {
  const { token } = useParams();
  const [state, setState] = useState('loading'); // loading | ok | limit | revoked | expired | notfound
  const [fileData, setFileData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await filesAPI.getSharedFile(token);
        setFileData(data);
        setState(data.can_download ? 'ok' : 'limit');
      } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.error || err.response?.data?.detail || '';
        if (status === 403) {
          if (msg.toLowerCase().includes('limit')) setState('limit');
          else setState('revoked');
        } else if (status === 410) {
          setState('expired');
        } else if (status === 404) {
          setState('notfound');
        } else {
          setErrorMsg(msg || 'Something went wrong.');
          setState('error');
        }
      }
    };
    fetch();
  }, [token]);

  return (
    <div className="min-h-screen bg-bg grid-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mb-10">
        <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
          <CloudUpload size={14} className="text-white" />
        </div>
        <span className="font-display font-bold text-text-primary text-lg tracking-tight">Cloudrope</span>
      </Link>

      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-7 shadow-xl shadow-black/40 animate-slide-up">
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted text-sm">Loading file…</p>
          </div>
        )}

        {state === 'ok' && fileData && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <FileIcon mimeType={fileData.mime_type} size="lg" />
              <div className="min-w-0">
                <h2 className="font-display font-semibold text-text-primary text-base truncate">
                  {fileData.file_name}
                </h2>
                <p className="text-text-muted text-xs mt-0.5">{formatFileSize(fileData.file_size)}</p>
              </div>
            </div>

            <div className="bg-elevated border border-border rounded-lg px-3 py-2.5">
              <p className="text-text-muted text-xs">Type: <span className="text-text-primary">{fileData.mime_type}</span></p>
            </div>

            <a
              href={fileData.download_url}
              download
              className="btn-primary w-full justify-center py-2.5"
            >
              <Download size={15} />
              Download file
            </a>
          </div>
        )}

        {state === 'limit' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
              <Ban size={20} className="text-warning" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-text-primary mb-1">Download limit reached</h2>
              {fileData && (
                <p className="text-text-muted text-sm mb-1">
                  <span className="text-text-primary font-medium">{fileData.file_name}</span>
                </p>
              )}
              <p className="text-text-muted text-sm">
                This file has reached its maximum number of downloads.
              </p>
            </div>
          </div>
        )}

        {state === 'revoked' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-12 h-12 bg-error/10 rounded-xl flex items-center justify-center">
              <AlertCircle size={20} className="text-error" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-text-primary mb-1">Link revoked</h2>
              <p className="text-text-muted text-sm">This share link has been revoked and is no longer active.</p>
            </div>
          </div>
        )}

        {state === 'expired' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-warning" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-text-primary mb-1">Link expired</h2>
              <p className="text-text-muted text-sm">This share link has expired and is no longer available.</p>
            </div>
          </div>
        )}

        {(state === 'notfound' || state === 'error') && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="w-12 h-12 bg-error/10 rounded-xl flex items-center justify-center">
              <AlertCircle size={20} className="text-error" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-text-primary mb-1">Not found</h2>
              <p className="text-text-muted text-sm">{errorMsg || 'This share link does not exist.'}</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-text-muted text-xs mt-6">
        Shared via{' '}
        <Link to="/" className="text-accent hover:underline">Cloudrope</Link>
      </p>
    </div>
  );
}

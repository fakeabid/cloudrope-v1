import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, CloudUpload, AlertCircle, Clock, Ban, Loader } from 'lucide-react';
import axios from 'axios';
import { BASE_URL } from '../api/axios';
import FileIcon from '../components/ui/FileIcon';
import { formatFileSize } from '../utils/formatters';

// States: loading | ok | downloading | limit | revoked | expired | notfound | error
export default function SharedFile() {
  const { token } = useParams();
  const [state, setState] = useState('loading');
  const [fileData, setFileData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${BASE_URL}/files/shared/${token}/`);
        setFileData(data);
        setState(data.can_download ? 'ok' : 'limit');
      } catch (err) {
        setState(classifyError(err));
      }
    };
    load();
  }, [token]);

  const handleDownload = useCallback(async () => {
    if (!fileData?.download_url) return;
    setState('downloading');
    try {
      const response = await axios.get(`${BASE_URL}/files/shared/${token}/download/`, {
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition, fall back to stored name
      const disposition = response.headers['content-disposition'] || '';
      const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]+)\1/);
      const fileName = match?.[2] || fileData.file_name;

      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // After a successful download, re-fetch metadata — the server may have
      // exhausted the download count on this last download.
      try {
        const { data: refreshed } = await axios.get(`${BASE_URL}/files/shared/${token}/`);
        setFileData(refreshed);
        setState(refreshed.can_download ? 'ok' : 'limit');
      } catch (refreshErr) {
        setState(classifyError(refreshErr));
      }
    } catch (err) {
      // Classify the download-time error and update the UI in place —
      // no raw DRF JSON ever shown to the user.
      setState(classifyError(err));
    }
  }, [token, fileData]);

  return (
    <div className="min-h-screen bg-bg grid-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mb-10">
        <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
          <CloudUpload size={14} className="text-white" />
        </div>
        <span className="font-display font-bold text-text-primary text-lg tracking-tight">
          Cloudrope
        </span>
      </Link>

      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-7 shadow-xl shadow-black/40 animate-slide-up">
        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-muted text-sm">Loading file…</p>
          </div>
        )}

        {(state === 'ok' || state === 'downloading') && fileData && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <FileIcon mimeType={fileData.mime_type} />
              <div className="min-w-0">
                <h2 className="font-display font-semibold text-text-primary text-base truncate">
                  {fileData.file_name}
                </h2>
                <p className="text-text-muted text-xs mt-0.5">{formatFileSize(fileData.file_size)}</p>
              </div>
            </div>

            <div className="bg-elevated border border-border rounded-lg px-3 py-2.5">
              <p className="text-text-muted text-xs">
                Type: <span className="text-text-primary">{fileData.mime_type}</span>
              </p>
            </div>

            <button
              onClick={handleDownload}
              disabled={state === 'downloading'}
              className="btn-primary w-full justify-center py-2.5"
            >
              {state === 'downloading' ? (
                <>
                  <Loader size={15} className="animate-spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <Download size={15} />
                  Download file
                </>
              )}
            </button>
          </div>
        )}

        {state === 'limit' && (
          <ErrorCard
            icon={<Ban size={20} className="text-warning" />}
            bg="bg-warning/10"
            title="Download limit reached"
            subtitle={fileData?.file_name}
            message="This file has reached its maximum number of downloads."
          />
        )}

        {state === 'revoked' && (
          <ErrorCard
            icon={<AlertCircle size={20} className="text-error" />}
            bg="bg-error/10"
            title="Link revoked"
            message="This share link has been revoked by the owner and is no longer active."
          />
        )}

        {state === 'expired' && (
          <ErrorCard
            icon={<Clock size={20} className="text-warning" />}
            bg="bg-warning/10"
            title="Link expired"
            message="This share link has expired and is no longer available."
          />
        )}

        {(state === 'notfound' || state === 'error') && (
          <ErrorCard
            icon={<AlertCircle size={20} className="text-error" />}
            bg="bg-error/10"
            title="Not found"
            message={errorMsg || 'This share link does not exist.'}
          />
        )}
      </div>

      <p className="text-text-muted text-xs mt-6">
        Shared via{' '}
        <Link to="/" className="text-accent hover:underline">Cloudrope</Link>
      </p>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function classifyError(err) {
  const status = err.response?.status;
  const msg    = (err.response?.data?.error || err.response?.data?.detail || '').toLowerCase();

  if (status === 410) return 'expired';
  if (status === 403) {
    if (msg.includes('limit') || msg.includes('download')) return 'limit';
    return 'revoked';
  }
  if (status === 404) return 'notfound';
  return 'error';
}

function ErrorCard({ icon, bg, title, subtitle, message }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <h2 className="font-display font-semibold text-text-primary mb-1">{title}</h2>
        {subtitle && (
          <p className="text-text-primary text-sm font-medium mb-1">{subtitle}</p>
        )}
        <p className="text-text-muted text-sm">{message}</p>
      </div>
    </div>
  );
}

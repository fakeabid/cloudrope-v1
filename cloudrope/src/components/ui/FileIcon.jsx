import { FileText, Image, File, FileType } from 'lucide-react';

const configs = {
  'application/pdf':  { icon: FileType,  bg: 'bg-error/10',    text: 'text-error',   label: 'PDF' },
  'image/jpeg':       { icon: Image,     bg: 'bg-accent/10',   text: 'text-accent',  label: 'JPEG' },
  'image/png':        { icon: Image,     bg: 'bg-accent/10',   text: 'text-accent',  label: 'PNG' },
  'text/plain':       { icon: FileText,  bg: 'bg-success/10',  text: 'text-success', label: 'TXT' },
};

export default function FileIcon({ mimeType, size = 'md' }) {
  const cfg = configs[mimeType] || { icon: File, bg: 'bg-elevated', text: 'text-text-muted', label: '?' };
  const Icon = cfg.icon;
  const iconSize = size === 'sm' ? 14 : 16;
  const padding = size === 'sm' ? 'p-1.5' : 'p-2';
  const rounded = 'rounded-lg';

  return (
    <div className={`${cfg.bg} ${padding} ${rounded} flex items-center justify-center flex-shrink-0`}>
      <Icon size={iconSize} className={cfg.text} />
    </div>
  );
}

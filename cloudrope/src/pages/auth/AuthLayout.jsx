import { Link } from 'react-router-dom';
import { CloudUpload } from 'lucide-react';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-bg grid-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mb-8">
        <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
          <CloudUpload size={14} className="text-white" />
        </div>
        <span className="font-display font-bold text-text-primary text-lg tracking-tight">
          Cloudrope
        </span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-7 animate-slide-up shadow-xl shadow-black/40">
        <div className="mb-6">
          <h1 className="font-display font-bold text-text-primary text-xl mb-1">{title}</h1>
          {subtitle && <p className="text-text-muted text-sm">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { CloudUpload, Shield, Share2, Zap, ArrowRight, Lock, RefreshCw } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Secure by default',
    desc: 'JWT-based auth with rotating refresh tokens. Your files, your control.',
  },
  {
    icon: Share2,
    title: 'Shareable links',
    desc: 'Generate time-limited or download-capped links for any file in seconds.',
  },
  {
    icon: Zap,
    title: 'Instant upload',
    desc: 'Drop files up to 10 MB with real-time progress. JPEG, PNG, PDF, and TXT supported.',
  },
  {
    icon: RefreshCw,
    title: 'Trash & restore',
    desc: 'Nothing is gone forever. Recover deleted files anytime before permanent removal.',
  },
  {
    icon: Lock,
    title: '100 MB free quota',
    desc: 'Every account gets 100 MB across active files and trash. Upgrade any time.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg grid-bg flex flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
            <CloudUpload size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-text-primary text-lg tracking-tight">
            Cloudrope
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth/login" className="btn-secondary py-1.5 text-sm">Sign in</Link>
          <Link to="/auth/register" className="btn-primary py-1.5 text-sm">Get started</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-8 py-24 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse-slow" />
          Personal file storage, simplified
        </div>

        <h1 className="font-display font-extrabold text-5xl md:text-7xl text-text-primary leading-[1.05] tracking-tight max-w-3xl mb-6">
          Your files,{' '}
          <span className="text-accent relative">
            wherever
            <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent/30 rounded-full" />
          </span>{' '}
          you need them.
        </h1>

        <p className="text-text-muted text-lg max-w-xl leading-relaxed mb-10">
          Cloudrope is a private, secure file host. Upload, share with expiring links, 
          and manage everything from a clean dashboard.
        </p>

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Link to="/auth/register" className="btn-primary px-6 py-3 text-base">
            Create free account
            <ArrowRight size={16} />
          </Link>
          <Link to="/auth/login" className="btn-secondary px-6 py-3 text-base">
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-surface border border-border rounded-xl p-5 hover:border-accent/30 transition-all duration-200 group"
              >
                <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                  <Icon size={16} className="text-accent" />
                </div>
                <h3 className="font-display font-semibold text-text-primary text-sm mb-1.5">{title}</h3>
                <p className="text-text-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-5 text-center text-text-muted text-xs">
        © {new Date().getFullYear()} Cloudrope — Personal file sharing
      </footer>
    </div>
  );
}

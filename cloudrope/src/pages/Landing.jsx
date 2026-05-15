import { Link } from 'react-router-dom';
import { Shield, Share2, Zap, ArrowRight, Lock, RefreshCw } from 'lucide-react';
import logo from '../assets/logo.svg'

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
      <header className="fixed top-6 inset-x-0 mx-auto z-50 w-[90%] max-w-3xl">
        <div className="flex items-center justify-between px-6 py-2 bg-white/60 hover:bg-white backdrop-blur-md border border-white/20 rounded-2xl shadow-lg shadow-blue-500/5 transition-all duration-300">     
          {/* Logo */}
          <Link to="/" className="flex items-center mt-2 gap-2 hover:cursor-pointer hover:opacity-90 transition-all duration-200">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center">
              <img src={logo} alt="Cloudrope Logo" className="w-8 h-8" />
            </div>
            <span className="font-display font-extrabold text-text-primary text-xs tracking-wide flex">
              cloudrope
            </span>
          </Link>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <Link to="/auth/login" className="btn-secondary py-1.5 text-sm">
              Sign in
            </Link>
            <Link to="/auth/register" className="btn-primary py-1.5 text-sm shadow-md shadow-accent/20">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-8 py-24 mt-10 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse-slow" />
          Personal file storage, simplified
        </div>

        <h1 className="font-display font-extrabold text-5xl md:text-7xl text-text-primary leading-[1.05] tracking-tight max-w-3xl mb-6">
          welcome to the{' '}
          <span className="text-accent">
            revolutionization
          </span>{' '}
          of file sharing<img src={logo} alt="Cloudrope Logo" className="inline w-20 h-20 ml-3 animate-pulse" />
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

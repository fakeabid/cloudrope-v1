import { Link } from 'react-router-dom';
import logo from '../../assets/logo.svg'

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-bg grid-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link to="/" className="flex items-center mb-6 gap-1 hover:cursor-pointer hover:opacity-90 transition-all duration-200">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center">
          <img src={logo} alt="Cloudrope Logo" className="w-10 h-10" />
        </div>
        <span className="font-display font-extrabold text-text-primary tracking-wide flex">
          cloud<span className='text-accent flex'>rope</span>
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

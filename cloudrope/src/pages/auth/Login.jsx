import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';
import { extractErrorMessage } from '../../utils/errors';

export default function Login() {
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ email, password }) => {
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = extractErrorMessage(err);
      if (msg.toLowerCase().includes('verify')) {
        setError('root', { message: msg });
      } else if (msg.toLowerCase().includes('credentials') || msg.toLowerCase().includes('invalid')) {
        setError('root', { message: msg });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Cloudrope account.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <div className="bg-error/10 border border-error/30 rounded-lg px-3 py-2.5 text-error text-xs">
            {errors.root.message}
            {errors.root.message?.toLowerCase().includes('verify') && (
              <span> — <Link to="/auth/resend-verification" className="underline">Resend link</Link></span>
            )}
          </div>
        )}

        <div>
          <label className="label">Email</label>
          <input
            className="input-field"
            type="email"
            placeholder="jane@example.com"
            autoComplete="email"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Password</label>
            <Link to="/auth/forgot-password" className="text-text-muted text-xs hover:text-accent transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              className="input-field pr-10"
              type={showPwd ? 'text' : 'password'}
              placeholder="Your password"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors.password && <p className="text-error text-xs mt-1">{errors.password.message}</p>}
        </div>

        <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in…
            </span>
          ) : 'Sign in'}
        </button>

        <p className="text-center text-text-muted text-xs pt-1">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-accent hover:underline">Create one</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

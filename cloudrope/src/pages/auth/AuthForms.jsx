import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { authAPI } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { extractErrorMessage } from '../../utils/errors';
import getErrorMessage from '../../utils/getErrorMessage';

// ─── Resend Verification ───────────────────────────────────────────────────────
export function ResendVerification() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    setIsLoading(true);
    try {
      await authAPI.resendVerification(email);
    } catch (_) {
      // Intentionally swallow all errors — showing any error here (including
      // "already verified" or "not found") would allow attacker enumeration.
      // The backend should also always return 200, but we enforce it here too.
    } finally {
      setSent(true);
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle size={36} className="text-success" />
          <p className="text-text-muted text-sm">
            If this email is registered and unverified, a new verification link has been sent.
          </p>
          <Link to="/auth/login" className="text-accent text-sm hover:underline">Back to sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Resend verification" subtitle="Enter your email to receive a new link.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            className="input-field"
            type="email"
            placeholder="jane@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
        </div>
        <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending…
            </span>
          ) : 'Send verification email'}
        </button>
        <p className="text-center">
          <Link to="/auth/login" className="text-text-muted text-xs hover:text-text-primary transition-colors">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// ─── Forgot Password ───────────────────────────────────────────────────────────
export function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    setIsLoading(true);
    try {
      await authAPI.forgotPassword(email);
    } catch (_) {}
    setSent(true);
    setIsLoading(false);
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle size={36} className="text-success" />
          <p className="text-text-muted text-sm">
            If an account with that email exists, a password reset link has been sent.
          </p>
          <Link to="/auth/login" className="text-accent text-sm hover:underline">Back to sign in</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send a reset link.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input
            className="input-field"
            type="email"
            placeholder="jane@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
        </div>
        <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending…
            </span>
          ) : 'Send reset link'}
        </button>
        <p className="text-center">
          <Link to="/auth/login" className="text-text-muted text-xs hover:text-text-primary transition-colors">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// ─── Reset Password ────────────────────────────────────────────────────────────
const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { clearAll } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm();

  const password = watch('password', '');

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="">
        <div className="text-center space-y-4 py-4">
          <p className="text-error text-sm">This reset link is missing a token. Please request a new one.</p>
          <Link to="/auth/forgot-password" className="text-accent text-sm hover:underline">
            Request new reset link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async ({ password, confirm_password }) => {
    setIsLoading(true);
    try {
      await authAPI.resetPassword({ token, password, confirm_password });
      clearAll();
      toast.success('Password reset successfully. Please sign in.');
      navigate('/auth/login', { replace: true });
    } catch (error) {
      const data = error.response?.data;
      if (data?.token) setError('root', { message: data.token[0] });
      else if (data?.confirm_password) setError('confirm_password', { message: data.confirm_password[0] });
      else toast.error(getErrorMessage(error, 'Password Reset failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {errors.root && (
          <div className="bg-error/10 border border-error/30 rounded-lg px-3 py-2.5 text-error text-xs">
            {errors.root.message}
            {errors.root.message?.toLowerCase().includes('expired') && (
              <span> — <Link to="/auth/forgot-password" className="underline">Request a new link</Link></span>
            )}
          </div>
        )}

        <div>
          <label className="label">New password</label>
          <div className="relative">
            <input
              className="input-field pr-10"
              type={showPwd ? 'text' : 'password'}
              {...register('password', {
                required: 'Password is required',
                pattern: {
                  value: PASSWORD_RULES,
                  message: 'Min 8 chars, uppercase, lowercase, digit, and special char',
                },
              })}
            />
            <button type="button" onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors.password && <p className="text-error text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="label">Confirm password</label>
          <div className="relative">
            <input
              className="input-field pr-10"
              type={showConfirm ? 'text' : 'password'}
              {...register('confirm_password', {
                required: 'Please confirm your password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors.confirm_password && <p className="text-error text-xs mt-1">{errors.confirm_password.message}</p>}
        </div>

        <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Resetting…
            </span>
          ) : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
}

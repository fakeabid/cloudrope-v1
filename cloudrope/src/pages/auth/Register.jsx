import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { authAPI } from '../../api/auth';
import { extractFieldErrors, extractErrorMessage } from '../../utils/errors';

const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export default function Register() {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password', '');

  const onSubmit = async (values) => {
    setIsLoading(true);
    try {
      await authAPI.register(values);
      setSuccess(true);
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length) {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          setError(field, { message: msg });
        });
      } else {
        toast.error(extractErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Check your inbox" subtitle="">
        <div className="space-y-4">
          <div className="bg-success/10 border border-success/30 rounded-lg px-4 py-3 text-success text-sm">
            Account created! We sent a verification link to your email. Please verify before logging in.
          </div>
          <div className="text-center">
            <p className="text-text-muted text-xs mb-2">Didn't receive it?</p>
            <Link to="/auth/resend-verification" className="text-accent text-sm hover:underline">
              Resend verification email
            </Link>
          </div>
          <div className="text-center pt-1">
            <Link to="/auth/login" className="text-text-muted text-sm hover:text-text-primary transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start storing and sharing files for free.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">First name</label>
            <input
              className="input-field"
              placeholder="Jane"
              {...register('first_name', { required: 'Required' })}
            />
            {errors.first_name && <p className="text-error text-xs mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="label">Last name</label>
            <input
              className="input-field"
              placeholder="Doe"
              {...register('last_name', { required: 'Required' })}
            />
            {errors.last_name && <p className="text-error text-xs mt-1">{errors.last_name.message}</p>}
          </div>
        </div>

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

        <div>
          <label className="label">Date of birth</label>
          <input
            className="input-field"
            type="date"
            {...register('date_of_birth', { required: 'Date of birth is required' })}
          />
          {errors.date_of_birth && <p className="text-error text-xs mt-1">{errors.date_of_birth.message}</p>}
        </div>

        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input
              className="input-field pr-10"
              type={showPwd ? 'text' : 'password'}
              placeholder="Min 8 chars, upper, lower, digit, special"
              {...register('password', {
                required: 'Password is required',
                pattern: {
                  value: PASSWORD_RULES,
                  message: 'Min 8 chars, uppercase, lowercase, digit, and special char (!@#$…)',
                },
              })}
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

        <div>
          <label className="label">Confirm password</label>
          <div className="relative">
            <input
              className="input-field pr-10"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat your password"
              {...register('confirm_password', {
                required: 'Please confirm your password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors.confirm_password && <p className="text-error text-xs mt-1">{errors.confirm_password.message}</p>}
        </div>

        <button type="submit" className="btn-primary w-full justify-center py-2.5 mt-1" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating account…
            </span>
          ) : 'Create account'}
        </button>

        <p className="text-center text-text-muted text-xs pt-1">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

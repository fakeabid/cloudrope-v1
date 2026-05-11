import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowRight, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthLayout from './AuthLayout';
import { authAPI } from '../../api/auth';
import { extractFieldErrors, extractErrorMessage } from '../../utils/errors';
import { Controller } from 'react-hook-form';
import DatePicker from '../../components/ui/DatePicker';

const PASSWORD_RULES = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
const EMAIL_RULES = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  { id: 1, label: 'Name' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Password' },
];

/* ── Strength meter ─────────────────────────────────────── */
function getConditions(pw) {
  return [
    { key: 'length',  label: 'At least 8 characters',  met: pw.length >= 8 },
    { key: 'upper',   label: 'One uppercase letter',    met: /[A-Z]/.test(pw) },
    { key: 'lower',   label: 'One lowercase letter',    met: /[a-z]/.test(pw) },
    { key: 'digit',   label: 'One number',              met: /\d/.test(pw) },
    { key: 'special', label: 'One special character',   met: /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
  ];
}

/* ── Step indicator ─────────────────────────────────────── */
function StepIndicator({ current, maxReached, onStepClick }) {
  return (
    <div className="flex items-center justify-center mb-7 gap-0">
      {STEPS.map((step, i) => {
        const done = step.id < current;
        const active = step.id === current;
        const reachable = step.id <= maxReached;

        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onStepClick(step.id)}
              className={[
                'relative flex flex-col items-center gap-1 group',
                reachable ? 'cursor-pointer' : 'cursor-default',
              ].join(' ')}
              aria-label={`Step ${step.id}: ${step.label}`}
            >
              {/* Circle */}
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                  done
                    ? 'bg-accent text-white scale-95'
                    : active
                    ? 'bg-accent text-white ring-4 ring-accent/20 scale-100'
                    : reachable
                    ? 'bg-surface border border-border text-text-muted group-hover:border-accent/60 group-hover:text-text-primary'
                    : 'bg-surface border border-border/50 text-text-muted/40',
                ].join(' ')}
              >
                {done ? <Check size={13} strokeWidth={2.5} /> : step.id}
              </div>
              {/* Label */}
              <span
                className={[
                  'text-[10px] font-medium tracking-wide transition-colors duration-200',
                  active ? 'text-accent' : done ? 'text-text-muted' : 'text-text-muted/40',
                ].join(' ')}
              >
                {step.label}
              </span>
            </button>

            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div className="w-12 h-px mx-1 mb-4 relative overflow-hidden bg-border/40 rounded-full">
                <div
                  className="absolute inset-y-0 left-0 bg-accent transition-all duration-500 rounded-full"
                  style={{ width: current > step.id ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Field wrapper ──────────────────────────────────────── */
function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && (
        <p className="text-error text-xs mt-1 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-error" />
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function Register() {
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [animDir, setAnimDir] = useState('forward'); // 'forward' | 'back'
  const [animating, setAnimating] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    trigger,
    setError,
    watch,
    control,
    formState: { errors },
  } = useForm({ mode: 'onChange' });

  const password = watch('password', '');
  const confirmPassword = watch('confirm_password', '');
  const emailValue = watch('email', '');
  const conditions = getConditions(password);
  const allConditionsMet = conditions.every((c) => c.met);

  useEffect(() => {
    if (confirmPassword) trigger('confirm_password');
  }, [password]);

  /* ── Navigation ─────────────────────────────── */
  const goTo = (target) => {
    if (target === step) return;
    setAnimDir(target > step ? 'forward' : 'back');
    setAnimating(true);
    setTimeout(() => {
      setStep(target);
      if (target > maxReached) setMaxReached(target);
      setAnimating(false);
    }, 180);
  };

  const nextStep = async () => {
    const fieldsPerStep = {
      1: ['first_name', 'last_name'],
      2: ['email', 'date_of_birth'],
    };
    const valid = await trigger(fieldsPerStep[step]);
    if (!valid) return;
    goTo(step + 1);
  };

  /* ── Submit ──────────────────────────────────── */
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
          // Jump to step that owns the errored field
          const stepOwner = ['first_name', 'last_name'].includes(field)
            ? 1
            : ['email', 'date_of_birth'].includes(field)
            ? 2
            : 3;
          if (stepOwner < step) goTo(stepOwner);
        });
      } else {
        toast.error(extractErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Success screen ──────────────────────────── */
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

  /* ── Step subtitles ──────────────────────────── */
  const subtitles = {
    1: "What should we call you?",
    2: 'Email and date of birth.',
    3: 'Secure your account.',
  };

  return (
    <AuthLayout title="Create your account" subtitle={subtitles[step]}>
      <StepIndicator
        current={step}
        maxReached={maxReached}
        onStepClick={(s) => goTo(s)}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* ── Animated step container ── */}
        <div
          className="transition-all duration-200"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${animDir === 'forward' ? '12px' : '-12px'})`
              : 'translateX(0)',
          }}
        >
          {/* ── Step 1: Name ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name" error={errors.first_name?.message}>
                  <input
                    className="input-field"
                    placeholder="Jane"
                    autoFocus
                    {...register('first_name', {
                      required: 'First name is required',
                      minLength: { value: 2, message: 'At least 2 characters' },
                      maxLength: { value: 50, message: 'Too long' },
                      pattern: {
                        value: /^[A-Za-z\s'-]+$/,
                        message: 'Letters only',
                      },
                    })}
                  />
                </Field>
                <Field label="Last name" error={errors.last_name?.message}>
                  <input
                    className="input-field"
                    placeholder="Doe"
                    {...register('last_name', {
                      required: 'Last name is required',
                      minLength: { value: 2, message: 'At least 2 characters' },
                      maxLength: { value: 50, message: 'Too long' },
                      pattern: {
                        value: /^[A-Za-z\s'-]+$/,
                        message: 'Letters only',
                      },
                    })}
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="btn-primary w-full justify-center py-2.5 mt-2 flex items-center gap-2"
              >
                Continue <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* ── Step 2: Email + DOB ── */}
          {step === 2 && (
            <div className="space-y-4">
              <Field label="Email" error={errors.email?.message}>
                <div className='relative'>
                  <input
                    className="input-field pr-8"
                    type="email"
                    placeholder="jane@example.com"
                    autoFocus
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: EMAIL_RULES,
                        message: 'Enter a valid email address',
                      },
                      maxLength: { value: 254, message: 'Email is too long' },
                    })}
                  />
                  {emailValue && EMAIL_RULES.test(emailValue) && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none">
                      <Check size={14} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
              </Field>

              <Field label="Date of birth" error={errors.date_of_birth?.message}>
                <Controller
                  control={control}
                  name="date_of_birth"
                  rules={{
                    required: 'Date of birth is required',
                    validate: (v) => {
                      if (!v) return 'Date of birth is required';
                      const dob = new Date(v + 'T00:00:00');
                      if (isNaN(dob)) return 'Invalid date';
                      const now = new Date();
                      const age = now.getFullYear() - dob.getFullYear();
                      const hadBirthday =
                        now.getMonth() > dob.getMonth() ||
                        (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
                      const realAge = hadBirthday ? age : age - 1;
                      if (realAge < 13) return 'You must be at least 13 years old';
                      if (realAge > 120) return 'Enter a valid date of birth';
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      error={!!errors.date_of_birth}
                      maxYear={new Date().getFullYear() - 13} // can't select a year that's too recent
                    />
                  )}
                />
              </Field>

              <button
                type="button"
                onClick={nextStep}
                className="btn-primary w-full justify-center py-2.5 mt-2 flex items-center gap-2"
              >
                Continue <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* ── Step 3: Password ── */}
          {step === 3 && (
            <div className="space-y-4">
              <Field label="Password" error={errors.password?.message}>
                <div className="relative">
                  <input
                    className="input-field pr-16"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min 8 chars, upper, lower, digit, special"
                    autoFocus
                    {...register('password', {
                      required: 'Password is required',
                      pattern: {
                        value: PASSWORD_RULES,
                        message: 'Password does not meet requirements',
                      },
                    })}
                  />
                  {/* Tick when all conditions met */}
                  {password && (
                    <span className="absolute right-9 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200">
                      {allConditionsMet
                        ? <Check size={13} strokeWidth={2.5} className="text-emerald-400" />
                        : null}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    tabIndex={-1}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {/* Strength meter */}
                {password && (
                  <ul className="mt-2.5 space-y-1">
                    {conditions.map((c) => (
                      <li
                        key={c.key}
                        className={[
                          'flex items-center gap-2 text-[11px] transition-colors duration-200',
                          c.met ? 'text-emerald-400' : 'text-text-muted/60',
                        ].join(' ')}
                      >
                        <span className={[
                          'flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-200',
                          c.met ? 'bg-emerald-400/15' : 'bg-border/40',
                        ].join(' ')}>
                          {c.met
                            ? <Check size={9} strokeWidth={3} />
                            : <span className="w-1 h-1 rounded-full bg-current opacity-40" />}
                        </span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </Field>

              <Field label="Confirm password" error={errors.confirm_password?.message}>
                <div className="relative">
                  <input
                    className="input-field pr-16"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    {...register('confirm_password', {
                      required: 'Please confirm your password',
                      validate: (v) => v === password || 'Passwords do not match',
                    })}
                  />
                  {/* Tick / X indicator */}
                  {confirmPassword && (
                    <span className="absolute right-9 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200">
                      {confirmPassword === password
                        ? <Check size={13} strokeWidth={2.5} className="text-emerald-400" />
                        : <X size={13} strokeWidth={2.5} className="text-error" />}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5 mt-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-text-muted text-xs pt-5">
          Already have an account?{' '}
          <Link to="/auth/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, MailCheck } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { authAPI } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | already | error
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const token = searchParams.get('token');
  const calledRef = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode's double-invoke in dev:
    // the first call verifies + consumes the token, the second call would
    // see it as already-verified. The ref ensures we only ever call once.
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setErrorMsg('No verification token found in the URL.');
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await authAPI.verifyEmail(token);

        if (data.user) {
          setVerifiedEmail(data.user.email);
          setStatus('success');
        } else {
          setStatus('already');
        }
      } catch (err) {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.detail ||
          'Verification failed. The link may be invalid or expired.';
        setErrorMsg(msg);
        setStatus('error');
      }
    };

    verify();
  }, [token]);

  return (
    <AuthLayout title="Email verification" subtitle="">
      <div className="flex flex-col items-center py-2 text-center gap-5">

        {status === 'loading' && (
          <>
            <Loader size={36} className="text-accent animate-spin" />
            <p className="text-text-muted text-sm">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center">
              <MailCheck size={26} className="text-success" />
            </div>
            <div className="space-y-1">
              <p className="text-text-primary font-display font-semibold text-base">
                Email verified!
              </p>
              {verifiedEmail && (
                <p className="text-accent text-sm font-medium">{verifiedEmail}</p>
              )}
              <p className="text-text-muted text-sm">
                Your account is ready. You can now sign in.
              </p>
            </div>
            <Link
              to="/auth/login"
              className="btn-primary w-full justify-center py-2.5 mt-1"
            >
              Sign In
            </Link>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="w-14 h-14 bg-elevated rounded-2xl flex items-center justify-center">
              <CheckCircle size={26} className="text-text-muted" />
            </div>
            <div className="space-y-1">
              <p className="text-text-primary font-display font-semibold text-base">
                Already verified
              </p>
              <p className="text-text-muted text-sm">
                This account has already been verified. Sign in to continue.
              </p>
            </div>
            <Link
              to="/auth/login"
              className="btn-primary w-full justify-center py-2.5 mt-1"
            >
              Sign in
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center">
              <XCircle size={26} className="text-error" />
            </div>
            <div className="space-y-1">
              <p className="text-text-primary font-display font-semibold text-base">
                Verification failed
              </p>
              <p className="text-text-muted text-sm">{errorMsg}</p>
            </div>
            <Link
              to="/auth/resend-verification"
              className="btn-primary w-full justify-center py-2.5 mt-1"
            >
              Request a new link
            </Link>
          </>
        )}

      </div>
    </AuthLayout>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { authAPI } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | already | error
  const [errorMsg, setErrorMsg] = useState('');
  const { updateTokens, updateUser } = useAuth();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token found in the URL.');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await authAPI.verifyEmail(token);

        if (data.tokens) {
          updateTokens(data.tokens);
          if (data.user) updateUser(data.user);
          setStatus('success');
          setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
        } else {
          // Already verified
          setStatus('already');
          setTimeout(() => navigate('/auth/login', { replace: true }), 2000);
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
      <div className="flex flex-col items-center py-4 text-center gap-4">
        {status === 'loading' && (
          <>
            <Loader size={36} className="text-accent animate-spin" />
            <p className="text-text-muted text-sm">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={36} className="text-success" />
            <div>
              <p className="text-text-primary font-medium text-sm mb-1">Email verified!</p>
              <p className="text-text-muted text-xs">Redirecting you to the dashboard…</p>
            </div>
          </>
        )}

        {status === 'already' && (
          <>
            <CheckCircle size={36} className="text-warning" />
            <div>
              <p className="text-text-primary font-medium text-sm mb-1">Already verified</p>
              <p className="text-text-muted text-xs">Redirecting you to sign in…</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={36} className="text-error" />
            <div>
              <p className="text-text-primary font-medium text-sm mb-1">Verification failed</p>
              <p className="text-text-muted text-xs mb-4">{errorMsg}</p>
              <Link
                to="/auth/resend-verification"
                className="text-accent text-sm hover:underline"
              >
                Request a new verification link
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, User, Calendar, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/auth';
import { extractErrorMessage } from '../../utils/errors';
import { formatDate } from '../../utils/formatters';

export default function Settings() {
  const { user, clearAll } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, watch, setError, formState: { errors }, reset } = useForm();
  const confirmText = watch('confirm_text', '');

  const handleDeleteAccount = async ({ delete_account_password }) => {
    const tokens = JSON.parse(localStorage.getItem('cr_tokens') || 'null');
    setIsDeleting(true);
    try {
      await authAPI.deleteAccount({ password: delete_account_password, refresh: tokens?.refresh });
      clearAll();
      toast.success('Account deleted.');
      navigate('/', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.password) {
        setError('password', { message: data.password[0] });
      } else {
        toast.error(extractErrorMessage(err));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setShowDeleteModal(false);
    reset();
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="mt-3 md:mt-0 mb-6">
        <h1 className="pt-2 pl-2 font-display font-bold text-text-primary text-2xl">settings</h1>
        <p className="pt-2 pl-2 text-text-muted text-sm">configure your app</p>
      </div>

      {/* Account info */}
      <div className="card duration-300 animate-slide-up">
        <h2 className="font-display font-semibold text-text-primary text-sm mb-4">Account information</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-elevated rounded-lg flex items-center justify-center flex-shrink-0">
              <User size={14} className="text-text-muted" />
            </div>
            <div>
              <p className="text-text-muted text-xs">Full name</p>
              <p className="text-text-primary text-sm font-medium">{user?.full_name || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-elevated rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail size={14} className="text-text-muted" />
            </div>
            <div>
              <p className="text-text-muted text-xs">Email</p>
              <p className="text-text-primary text-sm font-medium">{user?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-elevated rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar size={14} className="text-text-muted" />
            </div>
            <div>
              <p className="text-text-muted text-xs">Member since</p>
              <p className="text-text-primary text-sm font-medium">{formatDate(user?.date_joined)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-error/5 border border-error/20 rounded-xl p-5 duration-300 animate-slide-up">
        <h2 className="font-display font-semibold text-error text-sm mb-2">Danger zone</h2>
        <p className="text-text-muted text-sm leading-relaxed mb-4">
          Permanently deletes your account, all files, and all share links. 
          This action is <strong className="text-text-primary">irreversible</strong>.
        </p>
        <button
          className="btn-danger"
          onClick={() => setShowDeleteModal(true)}
        >
          <AlertTriangle size={14} />
          Delete my account
        </button>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={handleModalClose}
        title="Delete account"
        size="md"
      >
        <form autoComplete="off" onSubmit={handleSubmit(handleDeleteAccount)} className="space-y-4">
          <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3">
            <div className="flex gap-2.5">
              <AlertTriangle size={14} className="text-error flex-shrink-0 mt-0.5" />
              <p className="text-error text-xs leading-relaxed">
                This will permanently delete your account, all your files, and all share links. 
                This cannot be undone.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Current password</label>
            <div className="relative">
              <input
                className="input-field pr-10"
                type={showPwd ? 'text' : 'password'}
                placeholder="Enter your current password"
                autoComplete="new-password"
                {...register('delete_account_password', { required: 'Password is required' })}
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
            <label className="label">Type <span className="text-error font-mono">DELETE</span> to confirm</label>
            <input
              className="input-field font-mono"
              placeholder="DELETE"
              {...register('confirm_text', {
                required: 'Please type DELETE to confirm',
                validate: (v) => v === 'DELETE' || 'You must type DELETE exactly',
              })}
            />
            {errors.confirm_text && <p className="text-error text-xs mt-1">{errors.confirm_text.message}</p>}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn-secondary" onClick={handleModalClose} disabled={isDeleting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={isDeleting || confirmText !== 'DELETE'}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Deleting…
                </span>
              ) : (
                <>
                  <AlertTriangle size={13} />
                  Delete forever
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

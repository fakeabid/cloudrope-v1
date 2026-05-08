import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';
import { store } from './store/index';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import PublicRoute from './components/layout/PublicRoute';
import DashboardLayout from './components/layout/DashboardLayout';

import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import { ResendVerification, ForgotPassword, ResetPassword } from './pages/auth/AuthForms';
import Dashboard from './pages/dashboard/Dashboard';
import MyFiles from './pages/dashboard/MyFiles';
import Favorites from './pages/dashboard/Favorites';
import Trash from './pages/dashboard/Trash';
import Shares from './pages/dashboard/Shares';
import Settings from './pages/dashboard/Settings';
import SharedFile from './pages/SharedFile';

export default function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/auth/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/auth/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/auth/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/resend-verification" element={<ResendVerification />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="files" element={<MyFiles />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="trash" element={<Trash />} />
              <Route path="shares" element={<Shares />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/shared/:token" element={<SharedFile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#1C1F2A', color: '#E8EAF0',
                border: '1px solid #252836', borderRadius: '20px',
                fontSize: '13px', fontFamily: 'inherit', padding: '10px 14px',
              },
              success: { iconTheme: { primary: '#22C55E', secondary: '#1C1F2A' } },
              error:   { iconTheme: { primary: '#EF4444', secondary: '#1C1F2A' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </Provider>
  );
}

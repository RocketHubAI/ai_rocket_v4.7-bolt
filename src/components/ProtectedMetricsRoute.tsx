import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertCircle } from 'lucide-react';

interface ProtectedMetricsRouteProps {
  children: React.ReactNode;
}

const SUPER_ADMIN_EMAILS = [
  'clay@rockethub.ai',
  'derek@rockethub.ai',
  'marshall@rockethub.ai'
];

export const ProtectedMetricsRoute: React.FC<ProtectedMetricsRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkSuperAdmin = () => {
      if (!user) {
        setIsSuperAdmin(false);
        setChecking(false);
        return;
      }

      const userEmail = user.email?.toLowerCase();
      const isAdmin = SUPER_ADMIN_EMAILS.some(
        email => email.toLowerCase() === userEmail
      );

      setIsSuperAdmin(isAdmin);
      setChecking(false);
    };

    if (!loading) {
      checkSuperAdmin();
    }
  }, [user, loading]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <Shield className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Verifying permissions...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-md text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You don't have permission to access the User Metrics Dashboard.
            This area is restricted to super administrators only.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

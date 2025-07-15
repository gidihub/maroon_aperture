import { useEffect, useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { useAuth } from './AuthContext';

export default function AutoSetupAdmin() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setupAdmin();
    } else {
      setLoading(false);
    }
  }, [setupAdmin, user]);

  const setupAdmin = useCallback(async () => {
    try {
      console.log('🔧 Setting up admin access for user:', user.uid);
      const setupAdminFunction = httpsCallable(functions, 'setupAdmin');
      const response = await setupAdminFunction();
      
      console.log('✅ Setup result:', response.data);
      setResult({
        success: true,
        message: response.data.message,
        isAdmin: response.data.isAdmin
      });
    } catch (error) {
      console.error('❌ Setup admin error:', error);
      setResult({
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Auto Setup Admin</h1>
          <p className="text-gray-600">You must be logged in to set up admin access.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-4">Setting up admin access...</h1>
          <p className="text-gray-600">Please wait while we configure your admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Admin Setup Complete</h1>
        
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">
            <strong>User ID:</strong> {user.uid}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Email:</strong> {user.email}
          </p>
        </div>

        {result && (
          <div className={`p-3 rounded mb-4 ${
            result.error 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            {result.error ? (
              <div>
                <p><strong>Error:</strong> {result.error}</p>
                <p className="mt-2 text-sm">Please try refreshing the page or contact support.</p>
              </div>
            ) : (
              <div>
                <p><strong>Success!</strong></p>
                <p>{result.message}</p>
                <p className="mt-2">
                  <strong>Admin Status:</strong> {result.isAdmin ? '✅ Admin' : '❌ Not Admin'}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <a 
            href="/admin" 
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Admin Dashboard
          </a>
          <a 
            href="/dashboard" 
            className="block w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
} 
import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { useAuth } from './AuthContext';

export default function SetupAdmin() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { user } = useAuth();

  const setupAdmin = async () => {
    if (!user) {
      setResult({ error: 'You must be logged in' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const setupAdminFunction = httpsCallable(functions, 'setupAdmin');
      const response = await setupAdminFunction();
      
      setResult({
        success: true,
        message: response.data.message,
        isAdmin: response.data.isAdmin
      });
    } catch (error) {
      console.error('Setup admin error:', error);
      setResult({
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Setup Admin Access</h1>
          <p className="text-gray-600">You must be logged in to set up admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Setup Admin Access</h1>
        
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">
            <strong>User ID:</strong> {user.uid}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Email:</strong> {user.email}
          </p>
        </div>

        <button
          onClick={setupAdmin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded mb-4"
        >
          {loading ? 'Setting up...' : 'Setup Admin Access'}
        </button>

        {result && (
          <div className={`p-3 rounded ${
            result.error 
              ? 'bg-red-100 text-red-700 border border-red-300' 
              : 'bg-green-100 text-green-700 border border-green-300'
          }`}>
            {result.error ? (
              <p><strong>Error:</strong> {result.error}</p>
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

        <div className="mt-4 text-center">
          <a 
            href="/admin" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Try accessing admin dashboard
          </a>
        </div>
      </div>
    </div>
  );
} 
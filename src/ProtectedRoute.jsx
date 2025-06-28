// src/ProtectedRoute.jsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    console.log('ProtectedRoute user:', user);
    if (!loading && user) {
      if (requireAdmin) {
        const checkAdmin = async () => {
          const snap = await getDoc(doc(db, 'users', user.uid));
          const isAdmin = snap.exists() && snap.data().isAdmin;
          console.log('isAdmin from Firestore:', isAdmin);
          setAuthorized(isAdmin);
          setChecking(false);
        };
        checkAdmin();
      } else {
        setAuthorized(true);
        setChecking(false);
      }
    } else if (!user) {
      setChecking(false);
    }
  }, [user, loading, requireAdmin]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !authorized) {
    return <Navigate to="/" replace />;
  }

  return children;
}

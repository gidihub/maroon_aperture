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
    console.log("ProtectedRoute loading:", loading, "user:", user);
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
    } else if (!loading && !user) {
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
    console.log("ProtectedRoute: redirecting to / (not admin or not logged in)", { user: !!user, authorized });
    return <Navigate to="/" />;
  }

  console.log("ProtectedRoute: rendering children?", user && authorized, "user:", user, "authorized:", authorized);

  return children;
}

// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthForm from './AuthForm';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import Upload from './Upload';
import Gallery from './Gallery';
import PurchaseHistory from './PurchaseHistory';
import AdminDashboard from './AdminDashboard';
import SetupAdmin from './SetupAdmin';
import AutoSetupAdmin from './AutoSetupAdmin';
import ProtectedRoute from './ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthForm />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />

        <Route
          path="/gallery"
          element={
            <ProtectedRoute>
              <Gallery />
            </ProtectedRoute>
          }
        />

        <Route
          path="/purchase-history"
          element={
            <ProtectedRoute>
              <PurchaseHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/setup-admin"
          element={
            <ProtectedRoute>
              <SetupAdmin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/auto-setup-admin"
          element={
            <ProtectedRoute>
              <AutoSetupAdmin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;



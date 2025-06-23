// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthForm from './AuthForm';
import Dashboard from './Dashboard';
import ProtectedRoute from './ProtectedRoute';
import Signup from './Signup';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthForm />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

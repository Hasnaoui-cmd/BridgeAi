/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Layout from './components/Layout';
import Assistant from './components/Assistant';
// Documents page removed from sidebar
import RouteOptimizer from './pages/RouteOptimizer';
import Risk from './components/Risk';
import Prediction from './components/Prediction';
import Settings from './components/Settings';
import Login from './components/Login';
import SignUp from './components/SignUp';
import AdminDashboard from './components/AdminDashboard';
import { useAuth } from './lib/auth';

// Protected route wrapper — redirects non-admins to /assistant
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-stone-400">
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/assistant" replace />;
  }

  return <>{children}</>;
}

// Protected route wrapper — redirects to login if no user
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-stone-400">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<LandingPage />} />
        <Route element={<Layout />}>
          <Route path="assistant" element={<Assistant />} />
          <Route path="assistant/:sessionId" element={<Assistant />} />

          <Route 
            path="routes" 
            element={
              <ProtectedRoute>
                <RouteOptimizer />
              </ProtectedRoute>
            } 
          />
          <Route path="risks" element={<Risk />} />
          <Route 
            path="prediction" 
            element={
              <ProtectedRoute>
                <Prediction />
              </ProtectedRoute>
            } 
          />
          <Route path="settings" element={<Settings />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

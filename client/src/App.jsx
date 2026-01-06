// App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import UserDashboardPage from './pages/UserDashboardPage';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SuperAdminDashboardProvider } from './context/SuperAdminContext';
import { UserDashboardProvider } from './context/UserDashboardContext';
import { AdminProvider } from './context/AdminContext'; // Add this import

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#455185] to-[#ED1B2F]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect based on user role
    if (user.role === 'user') return <Navigate to="/user" />;
    if (user.role === 'admin') return <Navigate to="/admin" />;
    if (user.role === 'superadmin') return <Navigate to="/superadmin" />;
    return <Navigate to="/" />;
  }
  
  return children;
};

// SuperAdmin wrapper component
const SuperAdminWrapper = () => (
  <SuperAdminDashboardProvider>
    <SuperAdminDashboardPage />
  </SuperAdminDashboardProvider>
);

// User wrapper component
const UserWrapper = () => (
  <UserDashboardProvider>
    <UserDashboardPage />
  </UserDashboardProvider>
);

// Admin wrapper component
const AdminWrapper = () => (
  <AdminProvider> {/* Wrap with AdminProvider */}
    <AdminDashboardPage />
  </AdminProvider>
);

const AppRoutes = () => {
  const { user } = useAuth();

  // Determine default route based on user role
  const getDefaultRoute = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'user':
        return '/user';
      case 'admin':
        return '/admin';
      case 'superadmin':
        return '/superadmin';
      default:
        return '/';
    }
  };

  return (
    <Routes>
      {/* Redirect to appropriate dashboard based on role */}
      <Route 
        path="/" 
        element={<Navigate to={getDefaultRoute()} />} 
      />
      
      <Route 
        path="/login" 
        element={user ? <Navigate to={getDefaultRoute()} /> : <Login />} 
      />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/user"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <UserWrapper />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
            <AdminWrapper /> {/* Use AdminWrapper instead of AdminDashboardPage directly */}
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <SuperAdminWrapper />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-[#455185] to-[#ED1B2F]">
          <Navbar />
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
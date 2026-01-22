// App.jsx
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  useLocation,
  useNavigate,
  useNavigationType
} from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SuperAdminDashboardProvider } from './context/SuperAdminContext';
import { UserDashboardProvider } from './context/UserDashboardContext';
import { AdminProvider } from './context/AdminContext';

// Lazy load pages for better performance
const SuperAdminDashboardPage = lazy(() => import('./pages/SuperAdminDashboardPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const UserDashboardPage = lazy(() => import('./pages/UserDashboardPage'));

// Error Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#455185] to-[#ED1B2F] p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-red-600 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Something went wrong</h2>
        <p className="text-gray-600 mb-4 text-center">
          {error.message || 'An unexpected error occurred'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-gradient-to-r from-[#455185] to-[#ED1B2F] text-white rounded-lg hover:opacity-90 transition-opacity flex-1"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors flex-1"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

// Custom hook for navigation blocking
const useNavigationBlocker = (when, message = 'You have unsaved changes. Are you sure you want to leave?') => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (e) => {
      if (when) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [when, message]);

  const handleNavigation = (to) => {
    if (when && !window.confirm(message)) {
      // Cancel navigation
      if (pendingNavigation) {
        setPendingNavigation(null);
      }
      return false;
    }
    return true;
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    if (!when) return;

    const handlePopState = (event) => {
      if (when) {
        if (!handleNavigation(null)) {
          // Prevent navigation by pushing the current location back
          navigate(location.pathname, { replace: true });
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [when, navigate, location]);

  return {
    showPrompt,
    pendingNavigation,
    confirmNavigation: () => {
      setShowPrompt(false);
      if (pendingNavigation) {
        navigate(pendingNavigation);
        setPendingNavigation(null);
      }
    },
    cancelNavigation: () => {
      setShowPrompt(false);
      setPendingNavigation(null);
    },
    handleNavigation
  };
};

// Navigation Blocker Component
const NavigationBlocker = ({ when, message }) => {
  const blocker = useNavigationBlocker(when, message);
  
  // Show a custom modal instead of default confirm
  if (blocker.showPrompt && blocker.pendingNavigation) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-3">Unsaved Changes</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={blocker.cancelNavigation}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Stay
            </button>
            <button
              onClick={blocker.confirmNavigation}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Loading Component
const LoadingSpinner = ({ message = 'Loading dashboard...' }) => (
  <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#455185] to-[#ED1B2F]">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <div className="text-white text-lg">{message}</div>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles, requireAuth = true }) => {
  const { user, loading, error: authError } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (authError && !loading) {
      console.error('Authentication error:', authError);
      // You could dispatch an error notification here
    }
  }, [authError, loading]);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (authError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-white">
          <p>Authentication error. Please try logging in again.</p>
          <button
            onClick={() => navigate('/login', { state: { from: location }, replace: true })}
            className="mt-4 px-4 py-2 bg-white text-[#455185] rounded-lg hover:bg-gray-100"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (user && requireAuth && allowedRoles && !allowedRoles.includes(user.role)) {
    const roleRoutes = {
      'user': '/user',
      'admin': '/admin',
      'superadmin': '/superadmin'
    };
    
    const redirectTo = roleRoutes[user.role] || '/';
    return <Navigate to={redirectTo} replace />;
  }
  
  if (user && !requireAuth) {
    const roleRoutes = {
      'user': '/user',
      'admin': '/admin',
      'superadmin': '/superadmin'
    };
    
    const redirectTo = roleRoutes[user.role] || '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }
  
  return children;
};

// Wrapper Components with Error Boundaries
const SuperAdminWrapper = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<LoadingSpinner message="Loading Super Admin Dashboard..." />}>
        <SuperAdminDashboardProvider>
          <NavigationBlocker 
            when={hasUnsavedChanges} 
            message="You have unsaved changes. Are you sure you want to leave?"
          />
          <SuperAdminDashboardPage 
            onUnsavedChanges={setHasUnsavedChanges}
          />
        </SuperAdminDashboardProvider>
      </Suspense>
    </ErrorBoundary>
  );
};

const UserWrapper = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<LoadingSpinner message="Loading User Dashboard..." />}>
        <UserDashboardProvider>
          <NavigationBlocker 
            when={hasUnsavedChanges} 
            message="You have unsaved changes. Are you sure you want to leave?"
          />
          <UserDashboardPage 
            onUnsavedChanges={setHasUnsavedChanges}
          />
        </UserDashboardProvider>
      </Suspense>
    </ErrorBoundary>
  );
};

const AdminWrapper = () => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<LoadingSpinner message="Loading Admin Dashboard..." />}>
        <AdminProvider>
          <NavigationBlocker 
            when={hasUnsavedChanges} 
            message="You have unsaved changes. Are you sure you want to leave?"
          />
          <AdminDashboardPage 
            onUnsavedChanges={setHasUnsavedChanges}
          />
        </AdminProvider>
      </Suspense>
    </ErrorBoundary>
  );
};

// Main App Routes Component
const AppRoutes = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  
  // Track navigation history
  useEffect(() => {
    if (navigationType === 'POP') {
      console.log('User navigated back/forward');
      // You could add analytics or other tracking here
    }
  }, [navigationType, location]);
  
  // Handle navigation errors
  useEffect(() => {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      try {
        return originalPushState.apply(this, args);
      } catch (error) {
        console.error('Navigation error (pushState):', error);
        // Handle navigation error gracefully
        return null;
      }
    };
    
    history.replaceState = function(...args) {
      try {
        return originalReplaceState.apply(this, args);
      } catch (error) {
        console.error('Navigation error (replaceState):', error);
        return null;
      }
    };
    
    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);
  
  // Determine default route based on user role
  const getDefaultRoute = () => {
    if (!user) return '/login';
    
    const roleRoutes = {
      'user': '/user',
      'admin': '/admin',
      'superadmin': '/superadmin'
    };
    
    return roleRoutes[user.role] || '/dashboard';
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset app state on error boundary reset
        navigate('/');
      }}
    >
      <Routes>
        <Route 
          path="/" 
          element={<Navigate to={getDefaultRoute()} replace />} 
        />
        
        <Route 
          path="/login" 
          element={
            <ProtectedRoute requireAuth={false}>
              <Login />
            </ProtectedRoute>
          } 
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
          path="/user/*"
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserWrapper />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
              <AdminWrapper />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/superadmin/*"
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <SuperAdminWrapper />
            </ProtectedRoute>
          }
        />
        
        {/* 404 Page */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center text-white p-8 bg-black/20 rounded-xl backdrop-blur-sm">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-xl mb-6">Page not found</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                  >
                    ← Go Back
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-white text-[#455185] rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Go Home
                  </button>
                  {user && (
                    <button
                      onClick={() => navigate(getDefaultRoute())}
                      className="px-6 py-2 bg-gradient-to-r from-[#455185] to-[#ED1B2F] text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Go to Dashboard
                    </button>
                  )}
                </div>
              </div>
            </div>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
};

// Main App Component
const App = () => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-[#455185] to-[#ED1B2F]">
            <Navbar />
            <Suspense fallback={<LoadingSpinner />}>
              <AppRoutes />
            </Suspense>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

// Custom hook for navigation with history tracking
export const useAppNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navigateWithHistory = (to, options = {}) => {
    try {
      console.log(`Navigating from ${location.pathname} to ${to}`);
      navigate(to, options);
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback navigation
      window.location.href = to;
    }
  };
  
  const goBack = () => {
    try {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Go back failed:', error);
      window.history.back();
    }
  };
  
  const goForward = () => {
    try {
      navigate(1);
    } catch (error) {
      console.error('Go forward failed:', error);
      window.history.forward();
    }
  };
  
  const reload = () => {
    try {
      navigate(0); // This triggers a re-render
    } catch (error) {
      console.error('Reload failed:', error);
      window.location.reload();
    }
  };
  
  return {
    navigate: navigateWithHistory,
    goBack,
    goForward,
    reload,
    currentPath: location.pathname,
    locationState: location.state,
    canGoBack: window.history.length > 1
  };
};

export default App;
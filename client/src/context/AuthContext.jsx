import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Setup axios interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:5000/api';

  useEffect(() => {
    if (!import.meta.env.VITE_API_URL) {
      console.warn('⚠️ VITE_API_URL not set, using default:', API_URL);
    }
  }, []);

  // Set axios default timeout and base URL
  axios.defaults.timeout = 10000;
  axios.defaults.baseURL = API_URL;

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Auth token check:', token ? 'Token exists' : 'No token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Function to check authentication status, used initially and potentially on other events
  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get('/auth/me');
        setUser(response.data.user);
        setLoading(false);
      } catch (error) {
        console.error("Authentication check failed:", error);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };


  const fetchUser = async () => {
    try {
      // The token is now automatically included by the interceptor
      const response = await axios.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('token');
      // The interceptor will handle removing the header if needed, but we can explicitly clear it here too if the token itself is invalid.
      delete axios.defaults.headers.common['Authorization'];
      setUser(null); // Ensure user is cleared if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      // The interceptor will now handle setting the Authorization header for subsequent requests
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        throw new Error('Cannot connect to server. Please check if the server is running.');
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      console.error("Logout failed:", error);
      // Continue with local cleanup even if logout API call fails
    } finally {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization']; // Ensure header is cleared client-side as well
      setUser(null);
    }
  };

  const register = async (userData) => {
    await axios.post('/auth/register', userData);
  };

  useEffect(() => {
    checkAuth();

    // Keep-alive ping every 30 seconds to prevent server disconnection
    const keepAlive = setInterval(async () => {
      try {
        await axios.get(`${API_URL.replace('/api', '')}/ping`);
      } catch (error) {
        // Silently fail - server might be restarting
        console.debug('Keep-alive ping failed:', error.message);
      }
    }, 30000);

    return () => clearInterval(keepAlive);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};
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
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

  const fetchUser = async () => {
    try {
      // The token is now automatically included by the interceptor
      const response = await axios.get(`${API_URL}/auth/me`);
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
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    localStorage.setItem('token', response.data.token);
    // The interceptor will now handle setting the Authorization header for subsequent requests
    setUser(response.data.user);
    return response.data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
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
    await axios.post(`${API_URL}/auth/register`, userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, API_URL }}>
      {children}
    </AuthContext.Provider>
  );
};
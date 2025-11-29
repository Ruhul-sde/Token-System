
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();

  if (user.role === 'user') {
    return <Navigate to="/user" />;
  } else if (user.role === 'admin') {
    return <Navigate to="/admin" />;
  } else if (user.role === 'superadmin') {
    return <Navigate to="/superadmin" />;
  }

  return null;
};

export default Dashboard;

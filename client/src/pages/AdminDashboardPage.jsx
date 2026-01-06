import React from 'react';
import { AdminProvider } from '../context/AdminContext';
import AdminDashboard from '../components/admin/AdminDashboard';

const AdminDashboardPage = () => {
  return (
    <AdminProvider>
      <AdminDashboard />
    </AdminProvider>
  );
};

export default AdminDashboardPage;
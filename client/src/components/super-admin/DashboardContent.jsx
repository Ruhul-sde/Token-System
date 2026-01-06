// components/super-admin/DashboardContent.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import OverviewTab from './tabs/OverviewTab';
import TicketsTab from './tabs/TicketsTab';
import CompaniesTab from './tabs/CompaniesTab';
import DepartmentsTab from './tabs/DepartmentsTab';
import AdminsTab from './tabs/AdminsTab';
import UsersTab from './tabs/UsersTab';
import SolutionsDirectoryTab from './tabs/SolutionsDirectoryTab'; // Add this import

const DashboardContent = () => {
  const { activeTab } = useSuperAdmin();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'tickets':
        return <TicketsTab />;
      case 'companies':
        return <CompaniesTab />;
      case 'departments':
        return <DepartmentsTab />;
      case 'admins':
        return <AdminsTab />;
      case 'users':
        return <UsersTab />;
      case 'solutions': // Add this case
        return <SolutionsDirectoryTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <main className="relative z-10 container mx-auto px-4 min-h-[600px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </main>
  );
};

export default DashboardContent;
// components/super-admin/Navigation.jsx
import React from 'react';
import { useSuperAdmin } from '../../context/SuperAdminContext';

const Navigation = () => {
  const { activeTab, setActiveTab } = useSuperAdmin();
  
  const tabs = [
    { id: 'overview', icon: '⚡', label: 'Overview' },
    { id: 'tickets', icon: '🎫', label: 'Tickets' },
    { id: 'solutions', icon: '💡', label: 'Solutions Directory' }, // Add this line
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'departments', icon: '🏢', label: 'Departments' },
    { id: 'admins', icon: '🛡️', label: 'Admins' },
    { id: 'companies', icon: '💼', label: 'Companies' },
  ];

  return (
    <nav className="relative z-10 container mx-auto px-4 flex overflow-x-auto gap-2 mb-8 pb-2 sticky top-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`
            px-5 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 whitespace-nowrap
            ${activeTab === tab.id 
              ? 'bg-gradient-to-r from-[#ED1B2F] to-[#b91c1c] text-white shadow-lg shadow-red-900/20 scale-105' 
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white backdrop-blur-md border border-white/5'}
          `}
        >
          <span>{tab.icon}</span>
          <span className="font-semibold">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Navigation;
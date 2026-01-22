// components/super-admin/Header.jsx
import React from 'react';

const Header = ({ user }) => (
  <header className="relative z-10 container mx-auto px-4 py-6">
    <div className="flex flex-col md:flex-row justify-between items-end mb-10 pb-6 border-b border-white/10">
      <div>
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-2">
          Command Center
        </h1>
<p className="text-white font-semibold text-lg flex items-center gap-2">
  <span className="w-2 h-2 rounded-full bg-[#ED1B2F] animate-pulse"></span>
  System Operational • Welcome, {user?.name}
</p>

      </div>
      <div className="flex items-center gap-4 mt-4 md:mt-0">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ED1B2F] to-[#455185] p-0.5">
          <div className="w-full h-full bg-[#0f172a] rounded-[10px] flex items-center justify-center">
            <span className="font-bold text-xl">SA</span>
          </div>
        </div>
      </div>
    </div>
  </header>
);

export default Header;

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const Navbar = () => {
  const { user, logout, API_URL } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    employeeCode: user?.employeeCode || '',
    companyName: user?.companyName || ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setSuccess('');
        }, 2000);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      setError('Error changing password. Please try again.');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/auth/update-profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setIsEditingProfile(false);
        // Update user data in context if needed
        setTimeout(() => {
          setSuccess('');
          window.location.reload(); // Refresh to get updated user data
        }, 1500);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setError('Error updating profile. Please try again.');
    }
  };

  const openProfileModal = () => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      employeeCode: user?.employeeCode || '',
      companyName: user?.companyName || ''
    });
    setShowProfileModal(true);
    setShowProfileMenu(false);
    setIsEditingProfile(false);
  };

  if (!user) return null;

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'superadmin': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'admin': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      default: return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    }
  };

  return (
    <>
      <nav className="bg-gradient-to-r from-gray-900 via-[#1a1f3a] to-gray-900 border-b border-white/10 sticky top-0 z-50 shadow-2xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#ED1B2F] to-[#455185] rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border-2 border-white/20 group-hover:scale-110 transition-transform duration-300">
                  <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#ED1B2F] via-pink-500 to-[#455185] bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300">
                  TICKETING SYSTEM
                </h1>
                <p className="text-white/70 text-xs font-medium tracking-wide">Support Management Platform</p>
              </div>
            </div>
            
            {/* User Profile Section */}
            <div className="flex items-center gap-6">
              {/* User Info Card */}
              <div className="hidden md:flex items-center gap-4 bg-white/5 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/10 shadow-lg">
                <div className="text-right">
                  <p className="text-white font-semibold text-sm">{user.name}</p>
                  <p className="text-white/60 text-xs">{user.email}</p>
                </div>

                {/* Role Badge */}
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-lg uppercase tracking-wide ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
              </div>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ED1B2F] to-[#455185] rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold text-lg shadow-xl border-2 border-white/20 group-hover:scale-110 transition-transform duration-300">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                </button>

                {showProfileMenu && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileMenu(false)}
                    ></div>
                    
                    {/* Dropdown Menu */}
                    <div className="absolute right-0 mt-3 w-72 bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn">
                      <div className="p-5 border-b border-white/10 bg-gradient-to-r from-[#ED1B2F]/10 to-[#455185]/10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-bold truncate text-lg">{user.name}</p>
                            <p className="text-white/70 text-xs truncate">{user.email}</p>
                          </div>
                        </div>
                        {user.employeeCode && (
                          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                            <span className="text-white/50 text-xs">Employee ID:</span>
                            <span className="text-white font-mono text-xs">{user.employeeCode}</span>
                          </div>
                        )}
                        <div className="mt-3">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg uppercase tracking-wide ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={openProfileModal}
                          className="w-full text-left px-4 py-3 text-white/90 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 rounded-xl transition-all flex items-center gap-3 group"
                        >
                          <span className="text-xl group-hover:scale-110 transition-transform">👤</span>
                          <span className="font-medium">View Profile</span>
                        </button>
                        {(user.role === 'admin' || user.role === 'superadmin') && (
                          <button
                            onClick={() => {
                              setShowPasswordModal(true);
                              setShowProfileMenu(false);
                            }}
                            className="w-full text-left px-4 py-3 text-white/90 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 rounded-xl transition-all flex items-center gap-3 group"
                          >
                            <span className="text-xl group-hover:scale-110 transition-transform">🔒</span>
                            <span className="font-medium">Change Password</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            navigate('/dashboard');
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left px-4 py-3 text-white/90 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 rounded-xl transition-all flex items-center gap-3 group"
                        >
                          <span className="text-xl group-hover:scale-110 transition-transform">🏠</span>
                          <span className="font-medium">Dashboard</span>
                        </button>
                        <button
                          onClick={() => {
                            handleLogout();
                            setShowProfileMenu(false);
                          }}
                          className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-3 group"
                        >
                          <span className="text-xl group-hover:scale-110 transition-transform">🚪</span>
                          <span className="font-medium">Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowProfileModal(false)}>
          <div className="bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900 rounded-3xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white text-3xl shadow-lg">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white">My Profile</h3>
                  <p className="text-white/60 text-sm">View and manage your account details</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-xl mb-4 text-sm flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="bg-green-500/20 border border-green-500 text-white p-4 rounded-xl mb-4 text-sm flex items-start gap-3">
                <span className="text-xl">✅</span>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-5">
              {/* Role Badge */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white/60 text-sm mb-2">Role</p>
                <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg uppercase tracking-wide ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </span>
              </div>

              {/* Name */}
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                  placeholder="Enter your name"
                  disabled={!isEditingProfile}
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">Email Address</label>
                <input
                  type="email"
                  value={profileData.email}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white/50 placeholder-white/50 cursor-not-allowed"
                  disabled
                />
                <p className="text-white/40 text-xs mt-1">Email cannot be changed</p>
              </div>

              {/* Employee Code */}
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">Employee Code</label>
                <input
                  type="text"
                  value={profileData.employeeCode}
                  onChange={(e) => setProfileData({ ...profileData, employeeCode: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                  placeholder="Enter employee code"
                  disabled={!isEditingProfile}
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">Company Name</label>
                <input
                  type="text"
                  value={profileData.companyName}
                  onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                  placeholder="Enter company name"
                  disabled={!isEditingProfile}
                />
              </div>

              {/* Department */}
              {user?.department && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-white/60 text-sm mb-2">Department</p>
                  <p className="text-white font-semibold">{user.department.name}</p>
                </div>
              )}

              {/* Account Status */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white/60 text-sm mb-2">Account Status</p>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  user.status === 'suspended' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                  user.status === 'frozen' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' :
                  'bg-green-500/20 text-green-400 border border-green-500/50'
                }`}>
                  {user.status || 'active'}
                </span>
              </div>

              {/* Member Since */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white/60 text-sm mb-2">Member Since</p>
                <p className="text-white font-semibold">{new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                {!isEditingProfile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(false)}
                      className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-medium border border-white/20"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl transition-all font-medium shadow-lg"
                    >
                      Edit Profile
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileData({
                          name: user?.name || '',
                          email: user?.email || '',
                          employeeCode: user?.employeeCode || '',
                          companyName: user?.companyName || ''
                        });
                        setError('');
                      }}
                      className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-medium border border-white/20"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all font-medium shadow-lg"
                    >
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-gradient-to-br from-gray-900 via-[#1a1f3a] to-gray-900 rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ED1B2F] to-[#455185] flex items-center justify-center text-white text-2xl shadow-lg">
                🔒
              </div>
              <h3 className="text-3xl font-bold text-white">Change Password</h3>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-xl mb-4 text-sm flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            
            {success && (
              <div className="bg-green-500/20 border border-green-500 text-white p-4 rounded-xl mb-4 text-sm flex items-start gap-3">
                <span className="text-xl">✅</span>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-5">
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div>
                <label className="block text-white/90 mb-2 text-sm font-medium">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#ED1B2F] focus:border-transparent transition-all"
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-medium border border-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#ED1B2F] to-[#d41829] hover:from-[#d41829] hover:to-[#c01625] text-white rounded-xl transition-all font-medium shadow-lg"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

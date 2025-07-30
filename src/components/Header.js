import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const Header = () => {
  const { user, logout } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getUserInitials = (user) => {
    if (!user) return 'U';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U';
  };

  const getUserDisplayName = (user) => {
    if (!user) return 'User';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'User';
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <header className="bg-blue-600 text-white shadow-sm border-b border-blue-500">
      <div className="px-4">
        <div className="flex items-center justify-between h-12">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-sm font-semibold">ICPAC Boardroom Booking</h1>
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-blue-700 rounded px-2 py-1"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="text-right">
                <p className="text-xs font-medium">{getUserDisplayName(user)}</p>
                {user?.role && (
                  <p className="text-xs text-blue-200 capitalize">{user.role.replace('_', ' ')}</p>
                )}
              </div>
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">{getUserInitials(user)}</span>
              </div>
              <svg 
                className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <div className="px-4 py-2 text-sm text-gray-700 border-b">
                  <p className="font-medium">{getUserDisplayName(user)}</p>
                  <p className="text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
import React, { useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import AdminPortal from './AdminPortal';
import { ArrowLeft, Shield } from 'lucide-react';
import './index.css';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fscp_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Allows an admin to test/preview the faculty view
  const [isAdminPreviewingFaculty, setIsAdminPreviewingFaculty] = useState(false);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAdminPreviewingFaculty(false);
    localStorage.setItem('fscp_auth_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdminPreviewingFaculty(false);
    localStorage.removeItem('fscp_auth_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Admin User Flow
  if (user.role === 'admin') {
    if (isAdminPreviewingFaculty) {
      // Mock faculty session for previewing
      const previewFacultyUser = {
        id: 'preview-faculty',
        name: 'Preview Mode (Dr. Faculty)',
        department: 'Academic Faculty Preview',
        role: 'faculty'
      };

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <div className="admin-preview-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} />
              <strong>Administrator Faculty Preview Mode</strong> &mdash; Testing course lecture & assessment experience.
            </div>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={() => setIsAdminPreviewingFaculty(false)}
              style={{ background: '#fff', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={14} /> Exit Preview & Return to Admin Portal
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Dashboard user={previewFacultyUser} onLogout={handleLogout} />
          </div>
        </div>
      );
    }

    return (
      <AdminPortal 
        user={user} 
        onLogout={handleLogout} 
        onPreviewFaculty={() => setIsAdminPreviewingFaculty(true)} 
      />
    );
  }

  // Regular Faculty Flow
  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;

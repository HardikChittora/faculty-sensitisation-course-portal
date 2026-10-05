import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import AdminPortal from './AdminPortal';
import { ArrowLeft, Shield } from 'lucide-react';
import { enrollFacultyOnLogin } from './services/api';
import './index.css';

function MainApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fscp_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isAdminPreviewingFaculty, setIsAdminPreviewingFaculty] = useState(false);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAdminPreviewingFaculty(false);
    localStorage.setItem('fscp_auth_user', JSON.stringify(userData));
    if (userData.role === 'faculty') {
      enrollFacultyOnLogin(userData);
    }
    navigate(userData.role === 'admin' ? '/admin' : '/dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdminPreviewingFaculty(false);
    localStorage.removeItem('fscp_auth_user');
    navigate('/login');
  };

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />} />
      
      <Route path="/admin" element={
        user.role === 'admin' ? (
          isAdminPreviewingFaculty ? (
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
                <Dashboard user={{ id: 'preview-faculty', name: 'Preview Mode (Dr. Faculty)', department: 'Academic Faculty Preview', role: 'faculty' }} onLogout={handleLogout} isPreviewMode={true} />
              </div>
            </div>
          ) : (
            <AdminPortal 
              user={user} 
              onLogout={handleLogout} 
              onPreviewFaculty={() => setIsAdminPreviewingFaculty(true)} 
            />
          )
        ) : <Navigate to="/dashboard" replace />
      } />

      <Route path="/dashboard/*" element={
        user.role === 'faculty' ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/admin" replace />
      } />

      <Route path="/" element={<Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}

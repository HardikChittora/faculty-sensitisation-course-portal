import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, UserCheck, Award, Info, ArrowRight } from 'lucide-react';
import { loginWithZimbra } from './services/api';

export default function Login({ onLogin }) {
  const [roleMode, setRoleMode] = useState('faculty'); // 'faculty' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleToggle = (mode) => {
    setRoleMode(mode);
    setError('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await loginWithZimbra(email, password);
      if (response && response.user) {
        onLogin(response.user);
      } else {
        setError('Login failed: Invalid server response');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your institute credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zimbra-login-container">
      <div className="zimbra-login-card">
        {/* Brand Header */}
        <div className="zimbra-header">
          <div className="zimbra-logo-badge">
            <Award size={28} color="#ffffff" />
          </div>
          <h1>Faculty Sensitisation Portal</h1>
          <p className="zimbra-sub">Institute Zimbra Collaboration Suite Authentication</p>
        </div>

        {/* Role Toggle Switch */}
        <div className="role-switch-container">
          <button 
            type="button"
            className={`role-switch-btn ${roleMode === 'faculty' ? 'active' : ''}`}
            onClick={() => handleRoleToggle('faculty')}
          >
            <UserCheck size={16} /> Faculty Member
          </button>
          <button 
            type="button"
            className={`role-switch-btn ${roleMode === 'admin' ? 'active' : ''}`}
            onClick={() => handleRoleToggle('admin')}
          >
            <ShieldCheck size={16} /> Administrator
          </button>
        </div>

        {error && (
          <div className="error-msg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
          <div className="input-group">
            <label>
              {roleMode === 'admin' ? 'Admin ID or Zimbra Email' : 'Institute Zimbra Email / Faculty ID'}
            </label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input 
                type="text" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={roleMode === 'admin' ? 'admin@iitkgp.ac.in' : 'prof@dept.iitkgp.ac.in'}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Zimbra Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary zimbra-submit-btn" 
            disabled={loading}
          >
            {loading ? 'Authenticating with Zimbra...' : (
              <>
                Sign in with Zimbra SSO <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Use your institute Zimbra credentials to login.
        </div>
      </div>
    </div>
  );
}

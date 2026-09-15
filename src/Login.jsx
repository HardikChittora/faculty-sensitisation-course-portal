import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, UserCheck, Award, Info, ArrowRight, KeyRound } from 'lucide-react';
import { loginWithZimbra, requestOtp, verifyOtp } from './services/api';

export default function Login({ onLogin }) {
  const [roleMode, setRoleMode] = useState('faculty'); // 'faculty' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Only used for Admin
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleToggle = (mode) => {
    setRoleMode(mode);
    setError('');
    setEmail('');
    setPassword('');
    setOtp('');
    setOtpSent(false);
  };

  const handleAdminSubmit = async (e) => {
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
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestOtp(email);
      setOtpSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await verifyOtp(email, otp);
      if (response && response.user) {
        onLogin(response.user);
      } else {
        setError('Verification failed');
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP.');
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
          <p className="zimbra-sub">Institute Verification</p>
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

        {roleMode === 'admin' ? (
          // Admin Login Form (Unchanged)
          <form onSubmit={handleAdminSubmit} style={{ marginTop: '20px' }}>
            <div className="input-group">
              <label>Admin ID or Email</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input 
                  type="text" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@iitkgp.ac.in"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary zimbra-submit-btn" 
              disabled={loading}
            >
              {loading ? 'Authenticating...' : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          // Faculty OTP Login Form
          <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp} style={{ marginTop: '20px' }}>
            {!otpSent ? (
              // Step 1: Request OTP
              <>
                <div className="input-group">
                  <label>Institute Email / Faculty ID</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-icon" />
                    <input 
                      type="text" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="prof@iitkgp.ac.in"
                      required
                    />
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                    A one-time verification code will be sent to your email.
                  </p>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary zimbra-submit-btn" 
                  disabled={loading}
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </>
            ) : (
              // Step 2: Verify OTP
              <>
                <div className="input-group">
                  <label>Verification Code</label>
                  <div className="input-with-icon">
                    <KeyRound size={16} className="input-icon" />
                    <input 
                      type="text" 
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                    Code sent to <b>{email}</b>. 
                    <button type="button" onClick={() => setOtpSent(false)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', marginLeft: '5px' }}>
                      Change email
                    </button>
                  </p>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary zimbra-submit-btn" 
                  disabled={loading || otp.length < 6}
                >
                  {loading ? 'Verifying...' : (
                    <>
                      Verify & Login <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </>
            )}
          </form>
        )}

        <div className="mt-8 text-center text-sm text-slate-500">
          Secure institute authentication portal.
        </div>
      </div>
    </div>
  );
}

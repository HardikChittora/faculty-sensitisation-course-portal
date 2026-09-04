import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email === '123' && password === '123') {
      onLogin({ email, name: 'Dr. John Doe', department: 'Computer Science' });
    } else {
      setError('Invalid credentials. Hint: use 123 / 123');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Professor Portal</h1>
        <p>Sign in with your institute credentials</p>
        
        {error && <div className="error-msg">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Email ID</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. professor@institute.edu"
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import AuthLayout from './AuthLayout';
import loginImg from '../assets/img/login.jpg';

const Login = ({ onSwitch, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok) {
        onLoginSuccess(data.access_token, data.username, rememberMe, data.role, data.is_new_device || false, data.email || email);
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout image={loginImg}>
      <div className="auth-form">
        <h2>Welcome Back</h2>
        <p>Access your unified health intelligence and continue your journey to wellness.</p>

        {error && <p className="error-text" style={{color: '#ff4d4d', marginBottom: '0.75rem', fontSize: '0.85rem'}}>{error}</p>}

        <div className={`input-group ${email ? 'filled' : ''}`}>
          <input 
            type="email" 
            id="email"
            placeholder=" " 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label htmlFor="email">Email Address</label>
        </div>
        <div className={`input-group ${password ? 'filled' : ''}`}>
          <input 
            type={showPassword ? "text" : "password"} 
            id="password"
            placeholder=" " 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <label htmlFor="password">Password</label>
          <button 
            type="button" 
            className="password-toggle" 
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1"
          >
            <span className="material-icons-round">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem'}}>
          <label className="remember-me" style={{margin: 0}}>
            <input 
              type="checkbox" 
              checked={rememberMe} 
              onChange={(e) => setRememberMe(e.target.checked)} 
            />
            <span>Remember Me</span>
          </label>
          <span className="auth-link" style={{fontSize: '0.88rem'}} onClick={() => onSwitch('forgot-password')}>Forgotten Password?</span>
        </div>

        <button className="btn-primary" onClick={handleLogin} disabled={isLoading}>
          {isLoading ? (
            <div className="btn-spinner"></div>
          ) : (
            'Log In'
          )}
        </button>

        <div className="auth-footer">
          Don't have an account? <span className="auth-link" onClick={() => onSwitch('signup')}>Create Account</span>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;

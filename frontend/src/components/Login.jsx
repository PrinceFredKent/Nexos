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

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok) {
        onLoginSuccess(data.access_token, data.username, rememberMe, data.role, data.is_new_device || false);
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <AuthLayout image={loginImg}>
      <div className="auth-form">
        <h2>Hello!</h2>
        <p>We are glad to see you :)</p>

        <div className="social-auth">
            <div className="social-btn google-full" title="Sign in with Google">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </div>
        </div>

        <div className="divider"><span>Or</span></div>

        {error && <p className="error-text" style={{color: '#ff4d4d'}}>{error}</p>}

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

        <label className="remember-me">
          <input 
            type="checkbox" 
            checked={rememberMe} 
            onChange={(e) => setRememberMe(e.target.checked)} 
          />
          <span>Remember me?</span>
        </label>

        <button className="btn-primary" onClick={handleLogin}>Log In</button>

        <div className="auth-footer">
          Don't have an account? <span className="auth-link" onClick={onSwitch}>Create One</span>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;

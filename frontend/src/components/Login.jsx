import React, { useState, useEffect } from 'react';
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
        onLoginSuccess(data.access_token, data.username, rememberMe, data.role, data.is_new_device || false, data.email || email);
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleGoogleCallback = async (response) => {
    try {
      const res = await fetch(`${API_BASE_URL}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.access_token, data.username, true, data.role, data.is_new_device || false, data.email);
      } else {
        setError(data.detail || 'Google Login failed');
      }
    } catch (err) {
      setError('Connection error during Google login');
    }
  };

  useEffect(() => {
    /* global google */
    /* Google Login Temporarily Disabled
    if (window.google) {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "1080363277355-12nq3rf5nou0pn1sb9g6racb3ioaua8l.apps.googleusercontent.com",
        callback: handleGoogleCallback
      });

      google.accounts.id.renderButton(
        document.getElementById("googleBtn"),
        { 
          theme: "filled_blue", 
          size: "large", 
          width: "100%", 
          text: "continue_with",
          shape: "pill"
        }
      );
    }
    */
  }, []);

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

        <button className="btn-primary" onClick={handleLogin}>Log In</button>

        {/* Google Login Temporarily Disabled
        <div className="divider"><span>Or Login with</span></div>

        <div className="social-auth">
            <div id="googleBtn" style={{width: '100%', display: 'flex', justifyContent: 'center'}}></div>
        </div>
        */}

        <div className="auth-footer">
          Don't have an account? <span className="auth-link" onClick={() => onSwitch('signup')}>Create Account</span>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;

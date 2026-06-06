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
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  const validateEmail = (val) => {
    if (!val) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email format';
    return '';
  };

  const validatePassword = (val) => {
    if (!val) return 'Password is required';
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    setFieldErrors(prev => ({ ...prev, email: touched.email ? validateEmail(val) : '' }));
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    setFieldErrors(prev => ({ ...prev, email: validateEmail(email) }));
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setFieldErrors(prev => ({ ...prev, password: touched.password ? validatePassword(val) : '' }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
    setFieldErrors(prev => ({ ...prev, password: validatePassword(password) }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    // Mark all fields as touched and validate on submit
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setTouched({ email: true, password: true });
    setFieldErrors({ email: emailErr, password: passwordErr });
    if (emailErr || passwordErr) return;
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
        <h2 style={{ textAlign: 'center' }}>Welcome Back</h2>
        <p style={{ textAlign: 'center' }}>Access your unified health intelligence and continue your journey to wellness.</p>

        {error && <p className="error-text" style={{color: '#ff4d4d', marginBottom: '0.75rem', fontSize: '0.85rem'}}>{error}</p>}

        <div className={`input-group ${email ? 'filled' : ''}`}>
          <input 
            type="email" 
            id="email"
            placeholder=" " 
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            required
          />
          <label htmlFor="email">Email Address</label>
          {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
        </div>
        <div className={`input-group ${password ? 'filled' : ''}`} style={{ marginTop: fieldErrors.email ? '1.2rem' : undefined }}>
          <input 
            type={showPassword ? "text" : "password"} 
            id="password"
            placeholder=" " 
            value={password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
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
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </div>

        <div style={{ textAlign: 'right', marginBottom: '0.25rem'}}>
          
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

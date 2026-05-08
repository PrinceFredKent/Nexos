import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import AuthLayout from './AuthLayout';
import loginImg from '../assets/img/login.jpg';

const ForgotPassword = ({ onSwitch }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('A reset code has been sent to your email.');
        setStep(2);
      } else {
        setError(data.detail || 'Failed to send reset code');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/verify-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otp })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Code verified. Please enter your new password.');
        setStep(3);
      } else {
        setError(data.detail || 'Invalid or expired code');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otp, new_password: newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setStep(4); // Success step
      } else {
        setError(data.detail || 'Failed to reset password');
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
        <h2>{step === 4 ? 'Password Reset' : 'Reset Password'}</h2>
        <p>
          {step === 1 && "Enter your email address and we'll send you a code to reset your password."}
          {step === 2 && `Enter the 6-digit verification code sent to ${email}.`}
          {step === 3 && "Secure your account with a new password."}
          {step === 4 && "Your password has been reset successfully."}
        </p>

        {error && <p className="error-text" style={{color: '#ff4d4d', marginBottom: '0.75rem', fontSize: '0.85rem'}}>{error}</p>}
        {message && step !== 4 && <p className="success-text" style={{color: '#22c55e', marginBottom: '0.75rem', fontSize: '0.85rem'}}>{message}</p>}

        {step === 1 && (
          <form onSubmit={handleSendCode}>
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
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div className={`input-group ${otp ? 'filled' : ''}`}>
              <input 
                type="text" 
                id="otp"
                placeholder=" " 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
              />
              <label htmlFor="otp">6-Digit Code</label>
            </div>
            <div style={{display: 'flex', gap: '1rem'}}>
                <button type="button" className="btn-secondary" style={{flex: 1}} onClick={() => setStep(1)}>Back</button>
                <button type="submit" className="btn-primary" style={{flex: 2}} disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <div className={`input-group ${newPassword ? 'filled' : ''}`}>
              <input 
                type={showPassword ? "text" : "password"} 
                id="newPassword"
                placeholder=" " 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <label htmlFor="newPassword">New Password</label>
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
            
            <div className={`input-group ${confirmPassword ? 'filled' : ''}`}>
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                id="confirmPassword"
                placeholder=" " 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <label htmlFor="confirmPassword">Confirm Password</label>
              <button 
                type="button" 
                className="password-toggle" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex="-1"
              >
                <span className="material-icons-round">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save New Password'}
            </button>
          </form>
        )}

        {step === 4 && (
          <div className="success-content" style={{textAlign: 'center', marginTop: '1rem'}}>
            <div className="success-icon" style={{color: 'var(--primary)', marginBottom: '1.5rem'}}>
              <span className="material-icons-round" style={{fontSize: '4rem'}}>check_circle</span>
            </div>
            <button className="btn-primary" onClick={() => onSwitch('login')}>
              Return to Login
            </button>
          </div>
        )}

        {step !== 4 && (
          <div className="auth-footer" style={{marginTop: '2rem'}}>
            Remembered your password? <span className="auth-link" onClick={() => onSwitch('login')}>Login</span>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;

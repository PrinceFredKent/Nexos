import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';
import AuthLayout from './AuthLayout';
import verifyImg from '../assets/img/signup3.jpg'; // Reusing a high-end image

const VerifyAccount = ({ email, onVerificationSuccess, onBackToLogin }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: code })
      });

      const data = await response.json();
      if (response.ok) {
        onVerificationSuccess(data.access_token, data.username, true, data.role || 'patient', true, email);
      } else {
        setError(data.detail || 'Verification failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleResend = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setTimer(60);
        setError('');
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to resend code');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout image={verifyImg}>
      <div className="auth-form verify-view">
        <button className="back-btn" onClick={onBackToLogin}>
          <span className="material-icons-round">arrow_back</span>
        </button>
        
        <h2>Enter Verification Code</h2>
        <p>A 6-digit code was sent to your <span style={{color: 'var(--auth-accent)', fontWeight: '700'}}>phone number</span> via SMS. If you didn't receive it, check your email <span style={{color: 'var(--auth-accent)', fontWeight: '700'}}>({email})</span> as a fallback.</p>

        {error && <p className="error-text" style={{color: '#ff4d4d', marginBottom: '1.5rem', fontSize: '0.85rem'}}>{error}</p>}

        <div className="otp-input-container">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="otp-box"
              autoFocus={index === 0}
            />
          ))}
        </div>

        <button className="btn-primary" onClick={handleVerify} style={{marginTop: '2rem'}}>
          Continue
        </button>

        <div className="auth-footer" style={{marginTop: '1.5rem'}}>
          Don't receive the OTP? {' '}
          <span 
            className={`auth-link ${timer > 0 ? 'disabled' : ''}`} 
            onClick={handleResend}
            style={timer > 0 ? {opacity: 0.5, cursor: 'not-allowed', textDecoration: 'none'} : {}}
          >
            {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
          </span>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyAccount;

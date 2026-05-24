import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../store/useAuthStore';
import { secureStorage } from '../services/secureStorage';


const Settings = ({ patient, onUpdate, theme, setTheme, adminEmail, onSwitchTab }) => {
  const [activeSegment, setActiveSegment] = useState('account');
  const [prevSegment, setPrevSegment] = useState('account');
  const [pillStyle, setPillStyle] = useState({});
  const [message, setMessage] = useState('');
  const { appLockEnabled, setAppLockEnabled: setAppLockPreference, initializeAppLock } = useAuthStore();
  
  const isAdmin = adminEmail?.toLowerCase() === 'princefredkent@gmail.com' || localStorage.getItem('username') === 'Prince Fred Kent';
  const segments = ['account', 'notifications', 'appearance'];
  if (isAdmin) segments.push('intelligence');
  const navRef = React.useRef(null);
  const btnRefs = React.useRef({});
  
  const handleSegmentChange = (segment) => {
    if (segment === activeSegment) return;
    setPrevSegment(activeSegment);
    setActiveSegment(segment);
  };

  useEffect(() => {
    const activeBtn = btnRefs.current[activeSegment];
    const nav = navRef.current;
    if (activeBtn && nav) {
      const rect = activeBtn.getBoundingClientRect();
      const parentRect = nav.getBoundingClientRect();
      
      setPillStyle({
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        top: `${rect.top - parentRect.top}px`,
        left: `${rect.left - parentRect.left}px`
      });
    }
  }, [activeSegment]);

  const getDirection = () => {
    const prevIdx = segments.indexOf(prevSegment);
    const currentIdx = segments.indexOf(activeSegment);
    return currentIdx >= prevIdx ? 'right' : 'left';
  };

  const animationClass = activeSegment !== prevSegment 
    ? (getDirection() === 'right' ? 'slide-content-right' : 'slide-content-left')
    : '';

  
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    otp_code: ''
  });
  const [passwordStep, setPasswordStep] = useState(1); // 1: Input, 2: OTP
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // App Lock Settings State
  const [showDisableAppLockModal, setShowDisableAppLockModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisablingAppLock, setIsDisablingAppLock] = useState(false);
  const [showDisablePasswordField, setShowDisablePasswordField] = useState(false);

  useEffect(() => {
    if (appLockEnabled !== undefined) {
      setMessage('');
    }
  }, [appLockEnabled]);

  useEffect(() => {
    const loadAppLockSetting = async () => {
      const enabled = await secureStorage.getAppLockEnabled();
      await setAppLockPreference(enabled);
      await initializeAppLock();
    };
    loadAppLockSetting();
  }, []);

  // Theme and notification persistence is now handled by App.jsx or locally

  // Notification State
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('nexos_notifications');
    return saved ? JSON.parse(saved) : {
      reminders: true,
      summaries: false,
      alerts: true
    };
  });

  // Effect to persist notifications locally
  useEffect(() => {
    localStorage.setItem('nexos_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEnableAppLock = async () => {
    setMessage('');
    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Error: You must be logged in to enable app lock');
      return;
    }

    try {
      await secureStorage.setToken(token);
      await setAppLockPreference(true);
      await initializeAppLock();
      setMessage('App lock enabled. It will activate on next app open.');
    } catch (error) {
      console.error('Enable app lock error:', error);
      setMessage('Error: Could not enable app lock');
    }
  };

  const handleDisableAppLock = async () => {
    setMessage('');
    
    if (!disablePassword) {
      setMessage('Error: Password is required');
      return;
    }

    setIsDisablingAppLock(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: disablePassword
        })
      });

      if (response.ok) {
        await secureStorage.clearAppLockPreferences();
        await setAppLockPreference(false);
        setMessage('App lock disabled successfully.');
        setShowDisableAppLockModal(false);
        setDisablePassword('');
        setShowDisablePasswordField(false);
      } else {
        const data = await response.json();
        setMessage(`Error: ${data.detail || 'Password verification failed'}`);
      }
    } catch (err) {
      console.error('Disable app lock error:', err);
      setMessage('Error: Connection failed');
    } finally {
      setIsDisablingAppLock(false);
    }
  };

  const handleRequestOTP = async () => {
    setMessage('');
    
    if (!passwords.current_password || !passwords.new_password || !passwords.confirm_password) {
      setMessage('Error: All fields are required');
      return;
    }
    
    if (passwords.new_password !== passwords.confirm_password) {
      setMessage('Error: New passwords do not match');
      return;
    }

    if (passwords.new_password.length < 6) {
      setMessage('Error: Password must be at least 6 characters');
      return;
    }

    setIsUpdatingPassword(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/request-password-change-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwords.current_password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setPasswordStep(2);
        setMessage('Verification code sent to your email.');
      } else {
        setMessage(`Error: ${data.detail || 'Could not verify current password'}`);
      }
    } catch (err) {
      setMessage('Error: Connection failed');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handlePasswordChange = async () => {
    setMessage('');
    
    if (!passwords.otp_code) {
      setMessage('Error: Verification code is required');
      return;
    }

    setIsUpdatingPassword(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          new_password: passwords.new_password,
          otp_code: passwords.otp_code
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Password updated successfully!');
        setPasswords({ current_password: '', new_password: '', confirm_password: '', otp_code: '' });
        setPasswordStep(1);
      } else {
        setMessage(`Error: ${data.detail || 'Could not update password'}`);
      }
    } catch (err) {
      setMessage('Error: Connection failed');
    } finally {
      setIsUpdatingPassword(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        localStorage.clear();
        window.location.href = '/'; // Force reload to login
      } else {
        const data = await response.json();
        setMessage(`Error: ${data.detail || 'Could not delete account'}`);
        setShowDeleteConfirm(false);
      }
    } catch (err) {
      setMessage('Error: Connection failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="settings-container fade-in">
      
      {/* Settings Content */}
      <div className="settings-content">
        {message && (
          <div className={`slide-in-top ${message.includes('Error') ? 'error-banner' : 'success-banner'}`} style={{ 
              padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 600,
              background: message.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              color: message.includes('Error') ? '#ef4444' : '#22c55e',
              border: `1px solid ${message.includes('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
              textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {activeSegment === 'account' && (
          <div className={`settings-panel glass-card ${animationClass}`}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', margin: 0 }}>Account Security</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Manage your password, security protocols, and app lock.</p>
              </div>
              <div style={{ padding: '10px', background: 'rgba(67, 97, 238, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
                <span className="material-icons-round" style={{ fontSize: '2rem' }}>verified_user</span>
              </div>
            </div>

            {/* App Lock Settings */}
            <div className="setting-group" style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'rgba(67, 97, 238, 0.05)', borderRadius: '16px', border: '1px solid rgba(67, 97, 238, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons-round">fingerprint</span>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>App Lock Protection</h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {appLockEnabled ? 'Biometric & PIN unlock enabled' : 'App lock is disabled'}
                    </p>
                  </div>
                </div>
                <div 
                  onClick={() => {
                    if (appLockEnabled) {
                      setShowDisableAppLockModal(true);
                    } else {
                      handleEnableAppLock();
                    }
                  }}
                  style={{ 
                    background: appLockEnabled ? 'var(--primary)' : 'var(--border)', 
                    width: '50px', 
                    height: '26px', 
                    borderRadius: '30px', 
                    position: 'relative', 
                    transition: 'background 0.3s',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ 
                    background: 'white', 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    position: 'absolute', 
                    top: '3px', 
                    right: appLockEnabled ? '4px' : 'auto', 
                    left: !appLockEnabled ? '4px' : 'auto', 
                    transition: 'all 0.3s', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)' 
                  }}></div>
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '1rem 0 0 0' }}>
                {appLockEnabled 
                  ? 'Your app will unlock with biometric authentication or PIN, and your session will stay secure.' 
                  : 'Enable app lock to add an extra layer of security to your health data.'}
              </p>
            </div>
            
            <div className="setting-group" style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {passwordStep}
                </div>
                <h4 style={{ margin: 0 }}>{passwordStep === 1 ? 'Change Password' : 'Verify Your Identity'}</h4>
              </div>

              {passwordStep === 1 ? (
                <div className="password-input-group">
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showCurrent ? "text" : "password"} 
                      placeholder="Current Password" 
                      value={passwords.current_password}
                      onChange={e => setPasswords({...passwords, current_password: e.target.value})}
                      autoComplete="current-password"
                      style={{ padding: '1.1rem', paddingLeft: '3.2rem', paddingRight: '3.5rem', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box' }} 
                    />
                    <span className="material-icons-round" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.2rem' }}>lock_open</span>
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowCurrent(!showCurrent)}
                      tabIndex="-1"
                    >
                      <span className="material-icons-round">{showCurrent ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showNew ? "text" : "password"} 
                      placeholder="New Password" 
                      value={passwords.new_password}
                      onChange={e => setPasswords({...passwords, new_password: e.target.value})}
                      autoComplete="new-password"
                      style={{ padding: '1.1rem', paddingLeft: '3.2rem', paddingRight: '3.5rem', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box' }} 
                    />
                    <span className="material-icons-round" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.2rem' }}>password</span>
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowNew(!showNew)}
                      tabIndex="-1"
                    >
                      <span className="material-icons-round">{showNew ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showConfirm ? "text" : "password"} 
                      placeholder="Confirm New Password" 
                      value={passwords.confirm_password}
                      onChange={e => setPasswords({...passwords, confirm_password: e.target.value})}
                      autoComplete="new-password"
                      style={{ padding: '1.1rem', paddingLeft: '3.2rem', paddingRight: '3.5rem', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box' }} 
                    />
                    <span className="material-icons-round" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '1.2rem' }}>gpp_good</span>
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex="-1"
                    >
                      <span className="material-icons-round">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  <button 
                    className="btn-primary" 
                    onClick={handleRequestOTP}
                    disabled={isUpdatingPassword}
                    style={{ alignSelf: 'flex-start', marginTop: '0.5rem', padding: '0.8rem 1.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem', borderRadius: '12px' }}
                  >
                    {isUpdatingPassword ? <span className="spinner"></span> : <span className="material-icons-round">email</span>}
                    {isUpdatingPassword ? 'Verifying...' : 'Request Verification Code'}
                  </button>
                </div>
              ) : (
                <div className="otp-verification-flow fade-in">
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Enter the 6-digit code sent to <strong>{patient.email}</strong> to confirm your password change. (Be sure to check your spam/junk folder if you don't see it).
                  </p>
                  <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="Enter OTP Code" 
                      value={passwords.otp_code}
                      onChange={e => setPasswords({...passwords, otp_code: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                      maxLength={6}
                      style={{ 
                        padding: '1.2rem', 
                        fontSize: '1.5rem', 
                        letterSpacing: '0.5rem', 
                        textAlign: 'center', 
                        borderRadius: '16px', 
                        border: '2px solid var(--primary)', 
                        background: 'rgba(67, 97, 238, 0.05)', 
                        color: 'var(--primary)', 
                        width: '100%', 
                        fontWeight: 'bold',
                        boxSizing: 'border-box'
                      }} 
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      className="btn-primary" 
                      onClick={handlePasswordChange}
                      disabled={isUpdatingPassword || passwords.otp_code.length !== 6}
                      style={{ flex: 2, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', borderRadius: '12px' }}
                    >
                      {isUpdatingPassword ? <span className="spinner"></span> : <span className="material-icons-round">check_circle</span>}
                      Confirm Password Change
                    </button>
                    <button 
                      className="btn-secondary" 
                      onClick={() => setPasswordStep(1)}
                      style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="setting-group danger-zone-premium" style={{ 
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.1) 100%)', 
              padding: '2rem', 
              borderRadius: '24px', 
              border: '1px solid rgba(239, 68, 68, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.1, transform: 'rotate(15deg)' }}>
                <span className="material-icons-round" style={{ fontSize: '8rem', color: '#ef4444' }}>delete_forever</span>
              </div>
              
              <h4 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.8rem', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
                <span className="material-icons-round">report_problem</span> Danger Zone
              </h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0', maxWidth: '80%' }}>
                Once you delete your account, all your health records, clinical insights, and history will be permanently removed. This action cannot be undone.
              </p>
              
              {!showDeleteConfirm ? (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '14px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.8rem', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s' }}
                >
                  <span className="material-icons-round" style={{fontSize: '1.2rem'}}>delete_forever</span>
                  Delete My Account
                </button>
              ) : (
                <div className="delete-confirmation-box fade-in" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '2px solid #ef4444' }}>
                  <h5 style={{ color: '#0f172a', margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Are you absolutely sure?</h5>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>This will permanently erase your Nexos identity. You will be logged out immediately.</p>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '0.8rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      style={{ flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '0.8rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSegment === 'notifications' && (
          <div className={`settings-panel glass-card ${animationClass}`}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', margin: 0 }}>Notification Preferences</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Control how Nexos communicates with you.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div onClick={() => toggleNotification('reminders')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="material-icons-round" style={{color: 'var(--primary)'}}>alarm</span> Medication Reminders</h4>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Get alerted on your device when it's time to take your daily dose.</p>
                </div>
                <div style={{ background: notifications.reminders ? 'var(--primary)' : 'var(--border)', width: '50px', height: '26px', borderRadius: '30px', position: 'relative', transition: 'background 0.3s' }}>
                  <div style={{ background: 'white', width: '20px', height: '20px', borderRadius: '50%', position: 'absolute', top: '3px', right: notifications.reminders ? '4px' : 'auto', left: !notifications.reminders ? '4px' : 'auto', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                </div>
              </div>

              <div onClick={() => toggleNotification('summaries')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="material-icons-round" style={{color: 'var(--primary)'}}>summarize</span> Weekly Health Summary</h4>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Receive an email breakdown of your vitals and logging consistency.</p>
                </div>
                <div style={{ background: notifications.summaries ? 'var(--primary)' : 'var(--border)', width: '50px', height: '26px', borderRadius: '30px', position: 'relative', transition: 'background 0.3s' }}>
                  <div style={{ background: 'white', width: '20px', height: '20px', borderRadius: '50%', position: 'absolute', top: '3px', right: notifications.summaries ? '4px' : 'auto', left: !notifications.summaries ? '4px' : 'auto', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                </div>
              </div>

              <div onClick={() => toggleNotification('alerts')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="material-icons-round" style={{color: 'var(--primary)'}}>gpp_maybe</span> Security Alerts</h4>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Get notified of new logins from unrecognized devices.</p>
                </div>
                <div style={{ background: notifications.alerts ? 'var(--primary)' : 'var(--border)', width: '50px', height: '26px', borderRadius: '30px', position: 'relative', transition: 'background 0.3s' }}>
                  <div style={{ background: 'white', width: '20px', height: '20px', borderRadius: '50%', position: 'absolute', top: '3px', right: notifications.alerts ? '4px' : 'auto', left: !notifications.alerts ? '4px' : 'auto', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSegment === 'appearance' && (
          <div className={`settings-panel glass-card ${animationClass}`}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', margin: 0 }}>Interface Appearance</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Customize the look and feel of your Nexos dashboard.</p>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div 
                onClick={() => setTheme('light')}
                style={{ flex: 1, minWidth: '240px', border: theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '20px', padding: '1.2rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--text-main)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: theme === 'light' ? 'var(--shadow-md)' : 'none', position: 'relative', overflow: 'hidden' }}
              >
                <div className="theme-preview light" style={{ height: '100px', background: '#f8fafc', borderRadius: '12px', marginBottom: '1.2rem', padding: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '6px' }}>
                    <div style={{ width: '25%', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ height: '12px', background: '#4361ee', borderRadius: '2px', width: '40%' }}></div>
                        <div style={{ flex: 1, background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', padding: '6px' }}>
                            <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '1px', width: '80%', marginBottom: '4px' }}></div>
                            <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '1px', width: '60%' }}></div>
                        </div>
                    </div>
                </div>
                <h4 style={{ margin: '0 0 0.2rem 0' }}>Light Theme</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Always bright & clear</p>
                {theme === 'light' && <div style={{marginTop: '1rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'}}><span className="material-icons-round" style={{fontSize: '1rem'}}>check_circle</span> Active</div>}
              </div>

              <div 
                onClick={() => setTheme('dark')}
                style={{ flex: 1, minWidth: '240px', border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '20px', padding: '1.2rem', textAlign: 'center', cursor: 'pointer', background: '#0f172a', color: '#f8fafc', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : 'none', position: 'relative', overflow: 'hidden' }}
              >
                <div className="theme-preview dark" style={{ height: '100px', background: '#1e293b', borderRadius: '12px', marginBottom: '1.2rem', padding: '8px', border: '1px solid #334155', display: 'flex', gap: '6px' }}>
                    <div style={{ width: '25%', background: '#0f172a', borderRadius: '4px', border: '1px solid #334155' }}></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ height: '12px', background: '#5c7cfa', borderRadius: '2px', width: '40%' }}></div>
                        <div style={{ flex: 1, background: '#0f172a', borderRadius: '4px', border: '1px solid #334155', padding: '6px' }}>
                            <div style={{ height: '4px', background: '#334155', borderRadius: '1px', width: '80%', marginBottom: '4px' }}></div>
                            <div style={{ height: '4px', background: '#334155', borderRadius: '1px', width: '60%' }}></div>
                        </div>
                    </div>
                </div>
                <h4 style={{ margin: '0 0 0.2rem 0' }}>Dark Theme</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Easy on the eyes</p>
                {theme === 'dark' && <div style={{marginTop: '1rem', color: '#5c7cfa', fontWeight: 700, fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'}}><span className="material-icons-round" style={{fontSize: '1rem'}}>check_circle</span> Active</div>}
              </div>

              <div 
                onClick={() => setTheme('system')}
                style={{ flex: 1, minWidth: '240px', border: theme === 'system' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '20px', padding: '1.2rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--text-main)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: theme === 'system' ? '0 10px 30px rgba(67, 97, 238, 0.15)' : 'none', position: 'relative', overflow: 'hidden' }}
              >
                <div className="theme-preview system" style={{ height: '100px', background: 'linear-gradient(90deg, #f8fafc 50%, #1e293b 50%)', borderRadius: '12px', marginBottom: '1.2rem', position: 'relative', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex' }}>
                    <div style={{ flex: 1, padding: '4px', borderRight: '1px solid rgba(0,0,0,0.1)' }}>
                        <div style={{ height: '8px', background: '#4361ee', borderRadius: '2px', width: '40%', marginBottom: '4px' }}></div>
                        <div style={{ height: '30px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0' }}></div>
                    </div>
                    <div style={{ flex: 1, padding: '4px' }}>
                        <div style={{ height: '8px', background: '#5c7cfa', borderRadius: '2px', width: '40%', marginBottom: '4px' }}></div>
                        <div style={{ height: '30px', background: '#0f172a', borderRadius: '4px', border: '1px solid #334155' }}></div>
                    </div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-card)', border: '2px solid var(--primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                        <span className="material-icons-round" style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>settings_brightness</span>
                    </div>
                </div>
                <h4 style={{ margin: '0 0 0.2rem 0', fontWeight: 800 }}>System Default</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Syncs with your device</p>
                {theme === 'system' && <div style={{marginTop: '1rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'}}><span className="material-icons-round" style={{fontSize: '1rem'}}>check_circle</span> Active</div>}
              </div>
            </div>
          </div>
        )}

        {activeSegment === 'intelligence' && isAdmin && (
          <div className={`settings-panel glass-card ${animationClass}`}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', margin: 0 }}>Intelligence Management</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Access the core brain of Nexos to improve its clinical deliverance.</p>
            </div>
            
            <div className="intelligence-promo" style={{ 
                background: 'linear-gradient(135deg, rgba(67, 97, 238, 0.05) 0%, rgba(67, 97, 238, 0.1) 100%)',
                padding: '2.5rem',
                borderRadius: '24px',
                textAlign: 'center',
                border: '1px solid rgba(67, 97, 238, 0.2)'
            }}>
                <span className="material-icons-round" style={{ fontSize: '4rem', color: 'var(--primary)', marginBottom: '1rem' }}>psychology</span>
                <h3 style={{ marginBottom: '1rem' }}>Local Knowledge Base</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
                    You are authorized to manage the clinical data registry. Add new illnesses, symptoms, and health tips to improve the accuracy of local analysis.
                </p>
                <button 
                    onClick={() => onSwitchTab('intelligence')}
                    className="btn-primary"
                    style={{ padding: '1rem 2.5rem', borderRadius: '14px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.8rem' }}
                >
                    Open Intelligence Manager <span className="material-icons-round">open_in_new</span>
                </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Navigation - Now on the Right & Sticky */}
      <div className="settings-nav glass-card">
        <h3>Preferences</h3>
        
        <div className="settings-nav-inner" ref={navRef}>
          <div className="sliding-pill" style={pillStyle}></div>
          
          {segments.map((seg) => (
            <button 
              key={seg}
              ref={el => btnRefs.current[seg] = el}
              className={`settings-tab-btn ${activeSegment === seg ? 'active' : ''}`}
              onClick={() => handleSegmentChange(seg)}
            >
              <span className="material-icons-round">
                {seg === 'account' ? 'security' : seg === 'notifications' ? 'notifications' : seg === 'appearance' ? 'palette' : 'psychology'}
              </span>
              <span>{seg.charAt(0).toUpperCase() + seg.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Disable App Lock Modal */}
      {showDisableAppLockModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-main)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '420px',
            width: '90%',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons-round" style={{ color: '#ef4444' }}>lock_open</span>
              </div>
              <h3 style={{ margin: 0 }}>Disable App Lock?</h3>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              To disable app lock, please verify your account password. This is required for your security.
            </p>

            {!showDisablePasswordField ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  onClick={() => setShowDisablePasswordField(true)}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.8rem'
                  }}
                >
                  <span className="material-icons-round">password</span>
                  Verify Password
                </button>
                <button
                  onClick={() => setShowDisableAppLockModal(false)}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    fontWeight: 600,
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    placeholder="Enter your account password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '1rem',
                      paddingLeft: '2.8rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-main)',
                      boxSizing: 'border-box',
                      fontSize: '1rem'
                    }}
                  />
                  <span className="material-icons-round" style={{
                    position: 'absolute',
                    left: '0.8rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    fontSize: '1.2rem'
                  }}>lock</span>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={handleDisableAppLock}
                    disabled={isDisablingAppLock || !disablePassword}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      fontWeight: 600,
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      cursor: isDisablingAppLock || !disablePassword ? 'not-allowed' : 'pointer',
                      opacity: isDisablingAppLock || !disablePassword ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.8rem'
                    }}
                  >
                    {isDisablingAppLock ? (
                      <>
                        <div style={{ width: '16px', height: '16px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
                        Disabling...
                      </>
                    ) : (
                      <>
                        <span className="material-icons-round" style={{ fontSize: '1.1rem' }}>delete</span>
                        Disable App Lock
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowDisablePasswordField(false);
                      setDisablePassword('');
                    }}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '12px',
                      fontWeight: 600,
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-main)',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Settings;

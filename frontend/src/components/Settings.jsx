import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';


const Settings = ({ patient, onUpdate, theme, setTheme }) => {
  const [activeSegment, setActiveSegment] = useState('account');
  const [prevSegment, setPrevSegment] = useState('account');
  const [pillStyle, setPillStyle] = useState({});
  const [message, setMessage] = useState('');
  
  const segments = ['account', 'notifications', 'appearance'];
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

  
  // Account Security State
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handlePasswordChange = async () => {
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
      const response = await fetch(`${API_BASE_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwords.current_password,
          new_password: passwords.new_password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('Password updated successfully!');
        setPasswords({ current_password: '', new_password: '', confirm_password: '' });
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
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--primary)', margin: 0 }}>Account Security</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Manage your password and security protocols.</p>
            </div>
            
            <div className="setting-group" style={{ marginBottom: '2.5rem' }}>
              <h4>Change Password</h4>
              <div className="password-input-group">
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showCurrent ? "text" : "password"} 
                    placeholder="Current Password" 
                    value={passwords.current_password}
                    onChange={e => setPasswords({...passwords, current_password: e.target.value})}
                    autoComplete="current-password"
                    style={{ padding: '1.1rem', paddingRight: '3.5rem', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box' }} 
                  />
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
                    style={{ padding: '1.1rem', paddingRight: '3.5rem', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box' }} 
                  />
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
                    style={{ padding: '1.1rem', paddingRight: '3.5rem', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', width: '100%', boxSizing: 'border-box' }} 
                  />
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
                  onClick={handlePasswordChange}
                  disabled={isUpdatingPassword}
                  style={{ alignSelf: 'flex-start', marginTop: '0.5rem', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isUpdatingPassword ? <span className="spinner"></span> : <span className="material-icons-round">password</span>}
                  Update Password
                </button>
              </div>
            </div>

            <div className="setting-group" style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h4 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-icons-round">warning</span> Danger Zone
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.5rem 0 1rem 0' }}>Once you delete your account, there is no going back. Please be certain.</p>
              <button 
                onClick={() => alert("As a safety measure, Account Deletion must be done through patient support.")}
                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <span className="material-icons-round" style={{fontSize: '1.1rem'}}>delete_forever</span>
                Delete Account
              </button>
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
                style={{ flex: 1, minWidth: '200px', border: theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--text-main)', transition: 'all 0.2s', boxShadow: theme === 'light' ? 'var(--shadow-md)' : 'none' }}
              >
                <span className="material-icons-round" style={{ fontSize: '3rem', color: theme === 'light' ? 'var(--primary)' : 'var(--text-muted)' }}>light_mode</span>
                <h4 style={{ marginTop: '1rem', margin: '1rem 0 0.2rem 0' }}>Light Theme</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Always bright & clear</p>
                {theme === 'light' && <div style={{marginTop: '1rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'}}><span className="material-icons-round" style={{fontSize: '1rem'}}>check_circle</span> Active</div>}
              </div>

              <div 
                onClick={() => setTheme('dark')}
                style={{ flex: 1, minWidth: '200px', border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-input)', color: 'var(--text-main)', transition: 'all 0.2s', boxShadow: theme === 'dark' ? 'var(--shadow-md)' : 'none' }}
              >
                <span className="material-icons-round" style={{ fontSize: '3rem', color: theme === 'dark' ? 'var(--primary)' : 'var(--text-muted)' }}>dark_mode</span>
                <h4 style={{ marginTop: '1rem', margin: '1rem 0 0.2rem 0' }}>Dark Theme</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Easy on the eyes</p>
                {theme === 'dark' && <div style={{marginTop: '1rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px'}}><span className="material-icons-round" style={{fontSize: '1rem'}}>check_circle</span> Active</div>}
              </div>

              <div 
                onClick={() => setTheme('system')}
                style={{ flex: 1, minWidth: '200px', border: theme === 'system' ? '2px solid var(--primary)' : '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', background: 'linear-gradient(135deg, white 50%, #0f172a 50%)', transition: 'all 0.2s', boxShadow: theme === 'system' ? '0 4px 12px rgba(67,97,238,0.15)' : 'none' }}
              >
                <div style={{background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'inline-block', borderRadius: '50%', padding: '0.5rem'}}>
                    <span className="material-icons-round" style={{ fontSize: '3rem', color: theme === 'system' ? 'var(--primary)' : '#4b5563' }}>settings_brightness</span>
                </div>
                <h4 style={{ marginTop: '1rem', margin: '1rem 0 0.2rem 0', color: theme === 'system' ? 'var(--primary)' : '#0f172a', textShadow: theme === 'system' ? '0 1px 2px rgba(0,0,0,0.5)' : 'none' }}>System Default</h4>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Sync with your OS</p>
                {theme === 'system' && <div style={{marginTop: '1rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}><span className="material-icons-round" style={{fontSize: '1rem'}}>check_circle</span> Active</div>}
              </div>
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
                {seg === 'account' ? 'security' : seg === 'notifications' ? 'notifications' : 'palette'}
              </span>
              <span>{seg.charAt(0).toUpperCase() + seg.slice(1)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;

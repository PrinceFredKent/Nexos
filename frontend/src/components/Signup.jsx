import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AuthLayout from './AuthLayout';
import signup1 from '../assets/img/signup1.jpg';
import signup2 from '../assets/img/signup2.jpg';
import signup3 from '../assets/img/signup3.jpg';

const Signup = ({ onSwitch, onSignupAutoLogin, startingStep = 1, isCompletingProfile = false }) => {
  const [step, setStep] = useState(startingStep);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    showConfirmPassword: false,
    // Step 2: Health/Bio
    birthDate: '',
    gender: 'Other',
    bloodType: 'A+',
    weight: '',
    height: '',
    // Step 3: Emergency
    allergies: '',
    chronicConditions: '',
    emergencyName: '',
    emergencyPhone: '',
    // role: 'patient', // Removed roles
    // specialization: '',
    // licenseNo: '',
  });
  const [error, setError] = useState('');
  const [signupResult, setSignupResult] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null); // 'gender' | 'bloodType' | null
  const [googleData, setGoogleData] = useState(null); 
  const [isGoogleSignupFlow, setIsGoogleSignupFlow] = useState(false); 
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: '',
    phone: '',
    username: ''
  });
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close dropdowns when clicking outside
  const closeDropdowns = () => setOpenDropdown(null);

  // Reusable custom select
  const CustomSelect = ({ id, label, value, options, onChange, flex }) => (
    <div className="custom-select-wrapper input-group filled" style={flex ? {flex} : {}} onClick={(e) => e.stopPropagation()}>
      <span className="custom-select-label floated">{label}</span>
      <div
        className={`custom-select-trigger ${openDropdown === id ? 'open' : ''}`}
        onClick={() => setOpenDropdown(openDropdown === id ? null : id)}
      >
        <span>{value}</span>
        <svg className="cs-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {openDropdown === id && (
        <div className="custom-select-dropdown">
          {options.map(opt => (
            <div
              key={opt}
              className={`custom-select-option ${value === opt ? 'selected' : ''}`}
              onClick={() => { onChange(opt); setOpenDropdown(null); }}
            >
              <span>{opt}</span>
              {value === opt && (
                <svg className="cs-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  // Debounced email check
  useEffect(() => {
    if (!formData.email || !formData.email.includes('@')) {
      setFieldErrors(prev => ({ ...prev, email: '' }));
      return;
    }

    const timer = setTimeout(async () => {
      // Basic regex check first
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setFieldErrors(prev => ({ ...prev, email: 'Invalid email format' }));
        return;
      }

      setIsCheckingEmail(true);
      try {
        const res = await fetch(`${API_BASE_URL}/check-email?email=${encodeURIComponent(formData.email)}`);
        const data = await res.json();
        if (data.exists) {
          setFieldErrors(prev => ({ ...prev, email: 'This email is already registered' }));
        } else {
          setFieldErrors(prev => ({ ...prev, email: '' }));
        }
      } catch (err) {
        console.error("Email check failed:", err);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.email]);

  const validateStep1 = () => {
    const errors = {};
    if (!formData.username || formData.username.length < 3) errors.username = 'Name must be at least 3 characters';
    if (!formData.email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    
    if (!formData.phone) errors.phone = 'Phone number is required';
    else if (!/^\+?1?\d{9,15}$/.test(formData.phone)) errors.phone = 'Invalid phone format';

    if (!googleData && !isGoogleSignupFlow) {
      if (!formData.password) errors.password = 'Password is required';
      else if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
      
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    setFieldErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
        if (!validateStep1()) return;
        if (fieldErrors.email) {
            setError(fieldErrors.email);
            return;
        }
    }
    if (step === 2 && isCompletingProfile) {
        if (!formData.phone) {
            setError('Phone Number is required to complete your profile.');
            return;
        }
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handleSignup = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    
    if (isCompletingProfile && !formData.phone) {
        setError('Phone Number is required.');
        setStep(2);
        return;
    }

    setIsSubmitting(true);

    const endpoint = (isCompletingProfile || isGoogleSignupFlow) ? `${API_BASE_URL}/update-profile` : `${API_BASE_URL}/signup`;
    const method = (isCompletingProfile || isGoogleSignupFlow) ? 'PATCH' : 'POST';
    const token = localStorage.getItem('token');

    // Build payload — different shapes for signup vs profile completion
    let payload;
    if (isCompletingProfile || isGoogleSignupFlow) {
      // Only send fields that UserUpdate accepts; strip empty strings so we don't overwrite with blanks
      const raw = {
        phone: formData.phone,
        birth_date: formData.birthDate || null,
        gender: formData.gender,
        blood_type: formData.bloodType,
        weight: formData.weight || null,
        height: formData.height || null,
        allergies: formData.allergies || null,
        chronic_conditions: formData.chronicConditions || null,
        emergency_contact_name: formData.emergencyName || null,
        emergency_contact_phone: formData.emergencyPhone || null,
      };
      // Remove null/empty values so backend exclude_unset skips them correctly
      payload = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== null && v !== ''));
    } else {
      payload = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password || "oauth_managed_account",
        birth_date: formData.birthDate || null,
        gender: formData.gender,
        blood_type: formData.bloodType,
        weight: formData.weight,
        height: formData.height,
        allergies: formData.allergies,
        chronic_conditions: formData.chronicConditions,
        emergency_contact_name: formData.emergencyName,
        emergency_contact_phone: formData.emergencyPhone,
        profile_picture: googleData?.profile_picture || null,
        google_id: googleData?.google_id || null,
        role: 'patient'
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: { 
            'Content-Type': 'application/json',
            ...((isCompletingProfile || isGoogleSignupFlow) && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        if (isCompletingProfile || isGoogleSignupFlow) {
            onSignupAutoLogin(token, data.username || formData.username, true, 'patient', false, data.email);
        } else {
            onSignupAutoLogin(data.access_token, data.username, true, data.role, false, data.email || formData.email);
        }
      } else {
        const errorDetail = data.detail;
        if (typeof errorDetail === 'string') {
            setError(errorDetail);
        } else if (Array.isArray(errorDetail)) {
            // FastAPI validation error list
            setError(errorDetail[0]?.msg || 'Validation failed. Please check your inputs.');
        } else {
            setError('Update failed. Please try again.');
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError('Connection error: Is the backend running on port 8000?');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleCallback = async (accessToken) => {
    try {
      const res = await fetch(`${API_BASE_URL}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: accessToken })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.is_new_user) {
            // Save the token so that PATCH requests work!
            localStorage.setItem('token', data.access_token);
            setIsGoogleSignupFlow(true);
            
            // Pre-populate formData from the Google API response
            setFormData(prev => ({
                ...prev,
                username: data.username || '',
                email: data.email || '',
                birthDate: data.birth_date || '',
                gender: data.gender || 'Other',
                phone: data.phone || ''
            }));
            setError('');
            // Move to Step 2
            setStep(2); 
        } else {
            onSignupAutoLogin(data.access_token, data.username, true, data.role, data.is_new_device || false, data.email);
        }
      } else {
        setError(data.detail || 'Google Signup failed');
      }
    } catch (err) {
      setError('Connection error during Google signup');
    }
  };

  const handleGoogleClick = () => {
    /* global google */
    if (window.google) {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "1080363277355-12nq3rf5nou0pn1sb9g6racb3ioaua8l.apps.googleusercontent.com",
        scope: 'openid email profile https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.gender.read',
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            handleGoogleCallback(tokenResponse.access_token);
          } else {
            setError('Google authentication failed to return an access token.');
          }
        },
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      setError('Google client not loaded. Please try again later.');
    }
  };

  const currentImage = step === 4 ? signup3 : (step === 1 ? signup1 : (step === 2 ? signup2 : signup3));
  const progressWidth = (step / 3) * 100 > 100 ? 100 : (step / 3) * 100;
  const progressText = step === 1 ? "Just getting started..." : (step === 2 ? "Almost there!" : (step === 3 ? "One step away!" : "Welcome to NEXOS!"));

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div onClick={closeDropdowns}>
    <AuthLayout reverse={false} step={step} image={currentImage}>
      <div className="auth-form" style={{ position: 'relative' }}>
        {isSubmitting && (
          <div className="auth-loading-overlay">
            <div className="auth-spinner"></div>
            <p className="auth-loading-text">Securing your clinical profile...</p>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', width: '100%', gap: '0.5rem' }}>
          <h2 style={{ margin: 0, textAlign: 'left' }}>
            {isCompletingProfile ? 'Complete Profile' : (step === 1 ? 'Create Elite Account' : (step === 2 ? 'Clinical Vitals' : (step === 3 ? 'Emergency Protocol' : 'Identity Verified!')))}
          </h2>
        </div>
        <p>
            {isCompletingProfile ? 'Some essential health metrics are missing from your profile. Please complete them to ensure accurate AI analysis.' : 
            (step === 1 ? 'Initialize your clinical-grade health profile and join NEXOS.' : 
            (step === 2 ? 'Provide your baseline vitals for AI-driven health monitoring.' : 
            (step === 3 ? 'Establish emergency contact protocols for immediate response.' : `Welcome to the NEXOS network, ${formData.username}. Your intelligence-driven wellness journey starts now.`)))}
        </p>


        {error && <p className="error-text" style={{color: '#ff4d4d', fontSize: '0.8rem', marginBottom: '1rem'}}>{error}</p>}

        {step === 1 && (
          <div className="step-content" key="step1">
            <div className={`input-group ${formData.username ? 'filled' : ''}`}>
              <input type="text" id="username" placeholder=" " value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
              <label htmlFor="username">Full Name</label>
              {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
            </div>
            <div style={{display: 'flex', gap: '1rem'}}>
                <div className={`input-group ${formData.email ? 'filled' : ''}`} style={{flex: 1}}>
                  <input type="email" id="email" placeholder=" " value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  <label htmlFor="email">Email Address</label>
                  {isCheckingEmail && <div className="field-loader"></div>}
                  {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
                </div>
                <div className={`input-group ${formData.phone ? 'filled' : ''}`} style={{flex: 1}}>
                  <input type="tel" id="phone" placeholder=" " value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  <label htmlFor="phone">Phone Number</label>
                  {fieldErrors.phone && <span className="field-error">{fieldErrors.phone}</span>}
                </div>
            </div>
            <div style={{display: 'flex', gap: '1rem'}}>
                <div className={`input-group ${formData.password ? 'filled' : ''}`} style={{flex: 1}}>
                  <input 
                    type={formData.showPassword ? "text" : "password"} 
                    id="password" 
                    placeholder=" " 
                    value={formData.password} 
                    onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  />
                  <label htmlFor="password">Password</label>
                  {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
                  <button 
                    type="button" 
                    className="password-toggle" 
                    onClick={() => setFormData({...formData, showPassword: !formData.showPassword})}
                    tabIndex="-1"
                  >
                    <span className="material-icons-round">
                      {formData.showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <div className={`input-group ${formData.confirmPassword ? 'filled' : ''}`} style={{flex: 1}}>
                  <input 
                    type={formData.showConfirmPassword ? "text" : "password"} 
                    id="confirm" 
                    placeholder=" " 
                    value={formData.confirmPassword} 
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                  />
                  <label htmlFor="confirm">Confirm</label>
                  <button 
                    type="button" 
                    className="password-toggle" 
                    onClick={() => setFormData({...formData, showConfirmPassword: !formData.showConfirmPassword})}
                    tabIndex="-1"
                  >
                    <span className="material-icons-round">
                      {formData.showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
            </div>
            <button className="btn-primary" onClick={handleNext}>Continue</button>

            <div className="divider"><span>Or Create with</span></div>

            <div className="social-auth" style={{ marginBottom: '1rem' }}>
              <button 
                type="button" 
                className="google-btn-custom" 
                onClick={handleGoogleClick}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.5rem',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Create with Google</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content" key="step2">
            <div className={`input-group ${formData.birthDate ? 'filled' : ''}`}>
              <input type="date" id="birthDate" placeholder=" " value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} />
              <label htmlFor="birthDate">Birth Date</label>
            </div>

            {isCompletingProfile && (
              <div className={`input-group ${formData.phone ? 'filled' : ''}`}>
                <input type="tel" id="phone_comp" placeholder=" " value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                <label htmlFor="phone_comp">Phone Number</label>
              </div>
            )}
            
            <div style={{display: 'flex', gap: '1rem'}}>
                <CustomSelect
                  id="gender"
                  label="Gender"
                  value={formData.gender}
                  options={['Male', 'Female', 'Other']}
                  onChange={(val) => setFormData({...formData, gender: val})}
                  flex={1}
                />
                <CustomSelect
                  id="bloodType"
                  label="Blood Type"
                  value={formData.bloodType}
                  options={bloodTypes}
                  onChange={(val) => setFormData({...formData, bloodType: val})}
                  flex={1}
                />
            </div>
            <div style={{display: 'flex', gap: '1rem'}}>
                <div className={`input-group ${formData.weight ? 'filled' : ''}`} style={{flex: 1}}>
                  <input type="text" id="weight" placeholder=" " value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} />
                  <label htmlFor="weight">Weight (kg)</label>
                </div>
                <div className={`input-group ${formData.height ? 'filled' : ''}`} style={{flex: 1}}>
                  <input type="text" id="height" placeholder=" " value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} />
                  <label htmlFor="height">Height (cm)</label>
                </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem'}}>
                <div style={{display: 'flex', gap: '1rem'}}>
                    {!isCompletingProfile && (
                        <button className="btn-secondary" style={{flex: 1, margin: 0}} onClick={() => setStep(1)}>Back</button>
                    )}
                    <button className="btn-primary" style={{flex: isCompletingProfile ? 1 : 2, margin: 0}} onClick={handleNext}>Next: Safety</button>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                    {isCompletingProfile && (
                        <button 
                          className="btn-cancel-bottom" 
                          onClick={() => onSignupAutoLogin()}
                        >
                          Cancel
                        </button>
                    )}
                    <button 
                      className="btn-skip-bottom" 
                      style={{flex: isCompletingProfile ? 1 : 2}} 
                      onClick={() => handleSignup()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Skipping...' : 'Skip for Now'}
                    </button>
                </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content" key="step3">
            <div className={`input-group ${formData.allergies ? 'filled' : ''}`}>
              <input type="text" id="allergies" placeholder=" " value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})} />
              <label htmlFor="allergies">Known Allergies (e.g. Peanuts, Aspirin)</label>
            </div>
            <div className={`input-group ${formData.chronicConditions ? 'filled' : ''}`}>
              <input type="text" id="chronicConditions" placeholder=" " value={formData.chronicConditions} onChange={(e) => setFormData({...formData, chronicConditions: e.target.value})} />
              <label htmlFor="chronicConditions">Chronic Conditions (e.g. Diabetes, Asthma)</label>
            </div>
            <div className={`input-group ${formData.emergencyName ? 'filled' : ''}`}>
              <input type="text" id="emergName" placeholder=" " value={formData.emergencyName} onChange={(e) => setFormData({...formData, emergencyName: e.target.value})} />
              <label htmlFor="emergName">Emergency Contact Name</label>
            </div>
            <div className={`input-group ${formData.emergencyPhone ? 'filled' : ''}`}>
              <input type="tel" id="emergPhone" placeholder=" " value={formData.emergencyPhone} onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})} />
              <label htmlFor="emergPhone">Emergency Contact Phone</label>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem'}}>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <button className="btn-secondary" style={{flex: 1, margin: 0}} onClick={() => setStep(2)}>Back</button>
                    <button className="btn-primary" style={{flex: 2, margin: 0}} onClick={handleSignup}>Finalize Profile</button>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                    {isCompletingProfile && (
                        <button 
                          className="btn-cancel-bottom" 
                          onClick={() => onSignupAutoLogin()}
                        >
                          Cancel
                        </button>
                    )}
                    <button 
                      className="btn-skip-bottom" 
                      style={{flex: 2}} 
                      onClick={() => handleSignup()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Skipping...' : 'Skip for Now'}
                    </button>
                </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="step-content success-content" key="step4" style={{textAlign: 'center'}}>
            <div className="success-icon" style={{color: 'var(--primary)', marginBottom: '1rem'}}>
              <span className="material-icons-round" style={{fontSize: '4rem'}}>check_circle</span>
            </div>
            <p>Your profile has been successfully set up. You can now access all features including the AI symptom checker and health tracking.</p>
            <button 
                type="button"
                className="btn-primary" 
                onClick={(e) => { e.preventDefault(); onSignupAutoLogin(signupResult.access_token, signupResult.username, true, signupResult.role); }}
            >
                Go to Dashboard
            </button>
          </div>
        )}

        {step !== 4 && (
            <div className="auth-footer">
              {isCompletingProfile ? (
                <>Wrong account? <span className="auth-link" onClick={() => { localStorage.removeItem('token'); sessionStorage.removeItem('token'); window.location.reload(); }}>Logout</span></>
              ) : (
                <>Already a NEXOS member? <span className="auth-link" onClick={onSwitch}>Login</span></>
              )}
            </div>
        )}
      </div>

    </AuthLayout>
    </div>
  );
};

export default Signup;

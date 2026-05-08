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

  const handleNext = () => {
    if (step === 1) {
        if (!formData.username || !formData.phone || (!formData.password && !googleData)) {
            setError('Name, Phone and Password are required');
            return;
        }
        if (!googleData && formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
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
    
    if (isCompletingProfile && !formData.phone) {
        setError('Phone Number is required.');
        setStep(2);
        return;
    }

    const endpoint = isCompletingProfile ? `${API_BASE_URL}/update-profile` : `${API_BASE_URL}/signup`;
    const method = isCompletingProfile ? 'PATCH' : 'POST';
    const token = localStorage.getItem('token');

    // Build payload — different shapes for signup vs profile completion
    let payload;
    if (isCompletingProfile) {
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
        email: formData.email || null,
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
            ...(isCompletingProfile && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        if (isCompletingProfile) {
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
        if (data.is_new_user) {
            setGoogleData({
                email: data.email,
                username: data.full_name,
                profile_picture: data.profile_picture,
                google_id: data.google_id
            });
            setFormData(prev => ({
                ...prev,
                username: data.full_name,
                email: data.email
            }));
            setError('');
            // Move to step 1 to confirm name/phone
            setStep(1); 
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

  useEffect(() => {
    /* global google */
    /* Google Login Temporarily Disabled
    if (window.google) {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "1080363277355-12nq3rf5nou0pn1sb9g6racb3ioaua8l.apps.googleusercontent.com",
        callback: handleGoogleCallback
      });

      google.accounts.id.renderButton(
        document.getElementById("googleBtnSignup"),
        { 
          theme: "filled_blue", 
          size: "large", 
          width: "100%", 
          text: "signup_with",
          shape: "pill"
        }
      );
    }
    */
  }, []);

  const currentImage = step === 4 ? signup3 : (step === 1 ? signup1 : (step === 2 ? signup2 : signup3));
  const progressWidth = (step / 3) * 100 > 100 ? 100 : (step / 3) * 100;
  const progressText = step === 1 ? "Just getting started..." : (step === 2 ? "Almost there!" : (step === 3 ? "One step away!" : "Welcome to NEXOS!"));

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div onClick={closeDropdowns}>
    <AuthLayout reverse={false} step={step} image={currentImage}>
      <div className="auth-form">
        <h2>{isCompletingProfile ? 'Complete Profile' : (step === 1 ? 'Create Elite Account' : (step === 2 ? 'Clinical Vitals' : (step === 3 ? 'Emergency Protocol' : 'Identity Verified!')))}</h2>
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
            </div>
            <div style={{display: 'flex', gap: '1rem'}}>
                <div className={`input-group ${formData.email ? 'filled' : ''}`} style={{flex: 1}}>
                  <input type="email" id="email" placeholder=" " value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                  <label htmlFor="email">Email (Optional)</label>
                </div>
                <div className={`input-group ${formData.phone ? 'filled' : ''}`} style={{flex: 1}}>
                  <input type="tel" id="phone" placeholder=" " value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  <label htmlFor="phone">Phone Number</label>
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

            {/* Google Login Temporarily Disabled
            <div className="divider"><span>Or Create with</span></div>

            <div className="social-auth">
                <div id="googleBtnSignup" style={{width: '100%', display: 'flex', justifyContent: 'center'}}></div>
            </div>
            */}
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
            <div style={{display: 'flex', gap: '1rem'}}>
                {!isCompletingProfile && (
                    <button className="btn-secondary" style={{flex: 1}} onClick={() => setStep(1)}>Back</button>
                )}
                <button className="btn-primary" style={{flex: isCompletingProfile ? 1 : 2}} onClick={handleNext}>Next: Safety</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content" key="step3">
            <div className={`input-group ${formData.allergies ? 'filled' : ''}`}>
              <input type="text" id="allergies" placeholder=" " value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})} />
              <label htmlFor="allergies">Allergies & Conditions</label>
            </div>
            <div className={`input-group ${formData.emergencyName ? 'filled' : ''}`}>
              <input type="text" id="emergName" placeholder=" " value={formData.emergencyName} onChange={(e) => setFormData({...formData, emergencyName: e.target.value})} />
              <label htmlFor="emergName">Emergency Contact Name</label>
            </div>
            <div className={`input-group ${formData.emergencyPhone ? 'filled' : ''}`}>
              <input type="tel" id="emergPhone" placeholder=" " value={formData.emergencyPhone} onChange={(e) => setFormData({...formData, emergencyPhone: e.target.value})} />
              <label htmlFor="emergPhone">Emergency Contact Phone</label>
            </div>
            <div style={{display: 'flex', gap: '1rem'}}>
                <button className="btn-secondary" style={{flex: 1}} onClick={() => setStep(2)}>Back</button>
                <button className="btn-primary" style={{flex: 2}} onClick={handleSignup}>Finalize Profile</button>
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

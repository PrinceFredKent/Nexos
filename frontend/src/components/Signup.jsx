import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AuthLayout from './AuthLayout';
import signup1 from '../assets/img/signup1.jpg';
import signup2 from '../assets/img/signup2.jpg';
import signup3 from '../assets/img/signup3.jpg';

const Signup = ({ onSwitch, onSignupAutoLogin, startingStep = 1, isCompletingProfile = false, patientData = null }) => {
  // Initialize form data: use existing patient data if completing profile, otherwise use defaults
  const getInitialFormData = () => {
    if (isCompletingProfile && patientData) {
      return {
        username: patientData.username || '',
        email: patientData.email || '',
        phone: patientData.phone || '',
        password: '',
        confirmPassword: '',
        showPassword: false,
        showConfirmPassword: false,
        birthDate: patientData.birth_date || '',
        gender: patientData.gender || 'Other',
        bloodType: patientData.blood_type || 'A+',
        weight: patientData.weight || '',
        height: patientData.height || '',
        isPregnant: patientData.is_pregnant || false,
        pregnancyConceptionDate: patientData.pregnancy_conception_date || '',
        pregnancyDueDate: patientData.pregnancy_due_date || '',
        allergies: patientData.allergies || '',
        chronicConditions: patientData.chronic_conditions || '',
        emergencyName: patientData.emergency_contact_name || '',
        emergencyPhone: patientData.emergency_contact_phone || '',
      };
    }
    // Default values for new signup
    return {
      username: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      showPassword: false,
      showConfirmPassword: false,
      birthDate: '',
      gender: 'Other',
      bloodType: 'A+',
      weight: '',
      height: '',
      isPregnant: false,
      pregnancyConceptionDate: '',
      pregnancyDueDate: '',
      allergies: '',
      chronicConditions: '',
      emergencyName: '',
      emergencyPhone: '',
    };
  };

  const [step, setStep] = useState(startingStep);
  const [formData, setFormData] = useState(getInitialFormData());
  // Track which fields were actually modified by the user
  const [modifiedFields, setModifiedFields] = useState(new Set());
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
      // Only send fields that were actually modified (for updates)
      // This prevents overwriting fields like is_pregnant with default values
      const raw = {};
      
      // Always include these required fields if updating
      if (formData.phone) raw.phone = formData.phone;
      
      // Include optional fields only if they differ from initial data or were explicitly modified
      if (isCompletingProfile && patientData) {
        // Only include fields if they changed from the original patient data
        if (formData.birth_date !== patientData.birth_date) raw.birth_date = formData.birthDate || null;
        if (formData.gender !== patientData.gender) raw.gender = formData.gender;
        // CRITICAL FIX: Only include is_pregnant if it was actually changed by the user
        if (formData.isPregnant !== patientData.is_pregnant) raw.is_pregnant = formData.isPregnant;
          if (formData.pregnancyConceptionDate !== patientData.pregnancy_conception_date) {
            raw.pregnancy_conception_date = formData.isPregnant ? (formData.pregnancyConceptionDate || null) : null;
            // Auto-calculate due date (280 days from conception)
            if (formData.isPregnant && formData.pregnancyConceptionDate) {
              const conceptionDate = new Date(formData.pregnancyConceptionDate);
              const dueDate = new Date(conceptionDate);
              dueDate.setDate(dueDate.getDate() + 280);
              raw.pregnancy_due_date = dueDate.toISOString().split('T')[0];
            } else {
              raw.pregnancy_due_date = null;
            }
        }
        if (formData.bloodType !== patientData.blood_type) raw.blood_type = formData.bloodType;
        if (formData.weight !== patientData.weight) raw.weight = formData.weight || null;
        if (formData.height !== patientData.height) raw.height = formData.height || null;
        if (formData.allergies !== patientData.allergies) raw.allergies = formData.allergies || null;
        if (formData.chronicConditions !== patientData.chronic_conditions) raw.chronic_conditions = formData.chronicConditions || null;
        if (formData.emergencyName !== patientData.emergency_contact_name) raw.emergency_contact_name = formData.emergencyName || null;
        if (formData.emergencyPhone !== patientData.emergency_contact_phone) raw.emergency_contact_phone = formData.emergencyPhone || null;
      } else {
        // Google signup flow - send more fields as they're new
        raw.phone = formData.phone;
        raw.birth_date = formData.birthDate || null;
        raw.gender = formData.gender;
        raw.is_pregnant = formData.isPregnant;
        raw.pregnancy_conception_date = formData.isPregnant ? (formData.pregnancyConceptionDate || null) : null;
        // Auto-calculate due date (280 days from conception)
        if (formData.isPregnant && formData.pregnancyConceptionDate) {
          const conceptionDate = new Date(formData.pregnancyConceptionDate);
          const dueDate = new Date(conceptionDate);
          dueDate.setDate(dueDate.getDate() + 280);
          raw.pregnancy_due_date = dueDate.toISOString().split('T')[0];
        } else {
          raw.pregnancy_due_date = null;
        }
        raw.blood_type = formData.bloodType;
        raw.weight = formData.weight || null;
        raw.height = formData.height || null;
        raw.allergies = formData.allergies || null;
        raw.chronic_conditions = formData.chronicConditions || null;
        raw.emergency_contact_name = formData.emergencyName || null;
        raw.emergency_contact_phone = formData.emergencyPhone || null;
      }
      
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
        is_pregnant: formData.isPregnant,
        pregnancy_conception_date: formData.isPregnant ? (formData.pregnancyConceptionDate || null) : null,
        // Auto-calculate due date (280 days from conception)
        pregnancy_due_date: formData.isPregnant && formData.pregnancyConceptionDate ? (() => {
          const conceptionDate = new Date(formData.pregnancyConceptionDate);
          const dueDate = new Date(conceptionDate);
          dueDate.setDate(dueDate.getDate() + 280);
          return dueDate.toISOString().split('T')[0];
        })() : null,
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
            {formData.gender === 'Female' && (
              <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                <div className={`input-group filled`} style={{flex: 1}}>
                  <label htmlFor="isPregnant">Pregnancy Status</label>
                  <select
                    id="isPregnant"
                    value={formData.isPregnant ? 'yes' : 'no'}
                    onChange={(e) => setFormData({...formData, isPregnant: e.target.value === 'yes'})}
                    className="profile-input-elite"
                    style={{ padding: '0.8rem 1rem' }}
                  >
                    <option value="no">Not Pregnant</option>
                    <option value="yes">Pregnant</option>
                  </select>
                </div>
                {formData.isPregnant && (
                  <div style={{display: 'flex', gap: '1rem'}}>
                    <div className={`input-group ${formData.pregnancyConceptionDate ? 'filled' : ''}`} style={{flex: 1}}>
                      <input type="date" id="pregnancyConceptionDate" placeholder=" " value={formData.pregnancyConceptionDate} onChange={(e) => setFormData({...formData, pregnancyConceptionDate: e.target.value})} />
                      <label htmlFor="pregnancyConceptionDate">Conception Date</label>
                    </div>
                    <div className={`input-group filled`} style={{flex: 1}}>
                      <label htmlFor="pregnancyDueDate">Estimated Due Date</label>
                      <input type="text" id="pregnancyDueDate" placeholder=" " value={formData.pregnancyConceptionDate ? (() => {
                        const conceptionDate = new Date(formData.pregnancyConceptionDate);
                        const dueDate = new Date(conceptionDate);
                        dueDate.setDate(dueDate.getDate() + 280);
                        return dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                      })() : 'Select conception date'} disabled style={{backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed'}} />
                    </div>
                  </div>
                )}
              </div>
            )}
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

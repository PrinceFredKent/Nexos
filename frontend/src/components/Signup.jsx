import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import AuthLayout from './AuthLayout';
import signup1 from '../assets/img/signup1.jpg';
import signup2 from '../assets/img/signup2.jpg';
import signup3 from '../assets/img/signup3.jpg';

const Signup = ({ onSwitch, onSignupAutoLogin }) => {
  const [step, setStep] = useState(1);
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
        if (!formData.username || !formData.phone || !formData.password) {
            setError('Name, Phone and Password are required');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
    }
    setError('');
    setStep(prev => prev + 1);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email || null,
          phone: formData.phone,
          password: formData.password,
          birth_date: formData.birthDate || null,
          gender: formData.gender,
          blood_type: formData.bloodType,
          weight: formData.weight,
          height: formData.height,
          allergies: formData.allergies,
          chronic_conditions: formData.chronicConditions,
          emergency_contact_name: formData.emergencyName,
          emergency_contact_phone: formData.emergencyPhone,
          role: 'patient'
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSignupResult(data);
        setStep(4); // Move to Success Step
      } else {
        setError(data.detail || 'Signup failed');
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError('Connection error: Is the backend running on port 8000?');
    }
  };

  const currentImage = step === 4 ? signup3 : (step === 1 ? signup1 : (step === 2 ? signup2 : signup3));
  const progressWidth = (step / 3) * 100 > 100 ? 100 : (step / 3) * 100;
  const progressText = step === 1 ? "Just getting started..." : (step === 2 ? "Almost there!" : (step === 3 ? "One step away!" : "Welcome to NEXOS!"));

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <div onClick={closeDropdowns}>
    <AuthLayout reverse={step === 2} step={step} image={currentImage}>
      <div className="auth-form">
        <h2>{step === 1 ? 'Join NEXOS' : (step === 2 ? 'Health Profile' : (step === 3 ? 'Safety First' : 'Account Created!'))}</h2>
        <p>
            {step === 1 ? 'Start your journey to smarter health' : 
            (step === 2 ? 'Tell us about your vitals' : 
            (step === 3 ? 'In case of emergency, who should we call?' : `Welcome, ${formData.username}! Your health journey begins now.`))}
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

            <div className="divider"><span>Or Create with</span></div>

            <div className="social-auth">
              <div className="social-btn google-full" title="Sign up with Google">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Create with Google</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step-content" key="step2">
            <div className={`input-group ${formData.birthDate ? 'filled' : ''}`}>
              <input type="date" id="birthDate" placeholder=" " value={formData.birthDate} onChange={(e) => setFormData({...formData, birthDate: e.target.value})} />
              <label htmlFor="birthDate">Birth Date</label>
            </div>
            
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
                <button className="btn-secondary" style={{flex: 1}} onClick={() => setStep(1)}>Back</button>
                <button className="btn-primary" style={{flex: 2}} onClick={handleNext}>Next: Safety</button>
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
              Already a NEXOS member? <span className="auth-link" onClick={onSwitch}>Login</span>
            </div>
        )}
      </div>

    </AuthLayout>
    </div>
  );
};

export default Signup;

import React, { useState } from 'react';
import { API_BASE_URL } from '../config';


const Profile = ({ patient, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...patient });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'birth_date') {
      const age = calculateAge(value);
      setEditData(prev => ({ ...prev, [name]: value, age: age === 'N/A' ? prev.age : age }));
    } else {
      setEditData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditData(prev => ({ ...prev, profile_picture: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/update-profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });
      
      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
        setIsEditing(false);
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const err = await response.json();
        setMessage(`Error: ${err.detail || 'Could not update'}`);
      }
    } catch (err) {
      setMessage('Connection error');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const vitals = [
    { label: 'Birth Date', value: patient.birth_date, unit: '', name: 'birth_date', type: 'date', icon: 'cake' },
    { label: 'Age', value: calculateAge(patient.birth_date), unit: 'years', name: 'age', type: 'number', icon: 'event', readonly: true },
    { label: 'Gender', value: patient.gender, unit: '', name: 'gender', type: 'text', icon: 'person' },
    { label: 'Weight', value: patient.weight, unit: 'kg', name: 'weight', type: 'text', icon: 'monitor_weight' },
    { label: 'Height', value: patient.height, unit: 'cm', name: 'height', type: 'text', icon: 'height' },
    { label: 'Blood Type', value: patient.blood_type, unit: '', name: 'blood_type', type: 'text', icon: 'water_drop' }
  ];

  return (
    <div className="profile-container fade-in">
      <div className="profile-header-premium">
        <div className="profile-hero">
            <div className="profile-avatar-large" style={{ position: 'relative' }}>
                {(isEditing ? editData.profile_picture : patient.profile_picture) ? (
                    <img 
                        src={isEditing ? editData.profile_picture : patient.profile_picture} 
                        alt="Profile" 
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                ) : (
                    <span className="material-icons-round">account_circle</span>
                )}
                
                {isEditing && (
                    <div 
                        style={{
                            position: 'absolute', bottom: '0', right: '0', 
                            background: 'var(--primary)', color: 'white', 
                            borderRadius: '50%', width: '36px', height: '36px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} 
                        onClick={() => document.getElementById('profilePicInput').click()}
                    >
                        <span className="material-icons-round" style={{ fontSize: '20px', color: '#ffffff', zIndex: 10 }}>camera_alt</span>
                    </div>
                )}
                <input 
                    type="file" 
                    id="profilePicInput" 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={handleImageChange} 
                />
            </div>
            <div className="profile-title">
                <h2>{patient.username}</h2>
                <p className="account-type"><span className="material-icons-round">verified</span> Verified Patient</p>
            </div>
        </div>
        <button 
          className={`btn-profile-edit ${isEditing ? 'cancel' : ''}`} 
          onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
        >
          <span className="material-icons-round">{isEditing ? 'close' : 'edit'}</span>
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {message && <div className={`profile-message ${message.includes('Error') ? 'error' : 'success'} fade-in`}>{message}</div>}

      <div className="profile-grid">
        <div className="profile-card-group vitals-group">
          <h3>Personal Vitals</h3>
          <div className="vitals-grid">
            {vitals.map(v => (
              <div key={v.name} className="vital-card-small glass-card">
                <div className="vital-icon-box">
                    <span className="material-icons-round">{v.icon}</span>
                </div>
                <div className="vital-info">
                    <label>{v.label}</label>
                    {isEditing ? (
                      <input 
                        type={v.type} 
                        name={v.name} 
                        value={editData[v.name] || ''} 
                        onChange={handleChange}
                        className="profile-input"
                        readOnly={v.readonly}
                        style={v.readonly ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                      />
                    ) : (
                      <span className="vital-value">{v.value || 'N/A'} <small>{v.unit}</small></span>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="profile-card-group medical-group">
          <h3>Medical History</h3>
          <div className="glass-card full-width p-4">
              <div className="detail-row">
                  <span className="material-icons-round">warning</span>
                  <div className="detail-text">
                      <label>Allergies</label>
                      {isEditing ? (
                        <textarea name="allergies" value={editData.allergies || ''} onChange={handleChange} className="profile-textarea" />
                      ) : (
                        <p>{patient.allergies || 'No allergies listed'}</p>
                      )}
                  </div>
              </div>
              <div className="detail-row">
                  <span className="material-icons-round">history</span>
                  <div className="detail-text">
                      <label>Chronic Conditions</label>
                      {isEditing ? (
                        <textarea name="chronic_conditions" value={editData.chronic_conditions || ''} onChange={handleChange} className="profile-textarea" />
                      ) : (
                        <p>{patient.chronic_conditions || 'None reported'}</p>
                      )}
                  </div>
              </div>
          </div>
        </div>

        <div className="profile-card-group emergency-group">
          <h3>Emergency Contact</h3>
          <div className="glass-card full-width p-4 emergency-bg">
              <div className="detail-row">
                  <span className="material-icons-round">contact_phone</span>
                  <div className="detail-text">
                      <label>Contact Person</label>
                      {isEditing ? (
                        <input name="emergency_contact_name" value={editData.emergency_contact_name || ''} onChange={handleChange} className="profile-input" />
                      ) : (
                        <p className="font-bold">{patient.emergency_contact_name || 'Not set'}</p>
                      )}
                  </div>
              </div>
              <div className="detail-row">
                  <span className="material-icons-round">phone</span>
                  <div className="detail-text">
                      <label>Phone Number</label>
                      {isEditing ? (
                        <input name="emergency_contact_phone" value={editData.emergency_contact_phone || ''} onChange={handleChange} className="profile-input" />
                      ) : (
                        <p>{patient.emergency_contact_phone || 'N/A'}</p>
                      )}
                  </div>
              </div>
          </div>
        </div>
        <div className="profile-card-group contact-group">
          <h3>Account & Contact</h3>
          <div className="glass-card full-width p-4">
              <div className="detail-row">
                  <span className="material-icons-round">alternate_email</span>
                  <div className="detail-text">
                      <label>Email Address</label>
                      {isEditing ? (
                        <input type="email" name="email" value={editData.email || ''} onChange={handleChange} className="profile-input" />
                      ) : (
                        <p>{patient.email || 'No email provided'}</p>
                      )}
                  </div>
              </div>
              <div className="detail-row">
                  <span className="material-icons-round">phone_enabled</span>
                  <div className="detail-text">
                      <label>Phone Number</label>
                      {isEditing ? (
                        <input type="tel" name="phone" value={editData.phone || ''} onChange={handleChange} className="profile-input" />
                      ) : (
                        <p>{patient.phone || 'No phone provided'}</p>
                      )}
                  </div>
              </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="profile-actions-bottom slide-in-top">
          <button className="btn-primary large" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <span className="spinner"></span> : 'Save Profile Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;

import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import '../styles/profile_elite.css';

const Profile = ({ patient, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...patient });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage('');
    const token = localStorage.getItem('token');
    
    try {
      // Simulate/Trigger a manual sync refetch
      const response = await fetch(`${API_BASE_URL}/patient/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        onUpdate(data);
        setMessage('Health Data Synced!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      // Keep animation for a beat to feel 'substantial'
      setTimeout(() => setIsSyncing(false), 1200);
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

  return (
    <div className="profile-elite-wrapper fade-in">
      {/* ── Hero Header ── */}
      <div className="profile-hero-elite">
        {/* Background Photo */}
        {(isEditing ? editData.profile_picture : patient.profile_picture) && (
          <img 
            src={isEditing ? editData.profile_picture : patient.profile_picture} 
            className="profile-hero-image"
            alt="Profile Background" 
          />
        )}
        
        {/* Shadow Overlay */}
        <div className="profile-hero-overlay"></div>

        {/* Hero Content (Foreground) */}
        <div className="profile-hero-content">
          <h2 className="profile-name-elite">{patient.username}</h2>
          <div className="profile-badge-elite">
            <span className="material-icons-round">verified</span>
            Verified Patient
          </div>
          
          {isEditing && (
            <button 
              className="btn-primary" 
              style={{ marginTop: '1.5rem', padding: '0.6rem 1.2rem', fontSize: '0.8rem', borderRadius: '50px' }}
              onClick={() => document.getElementById('profilePicInput').click()}
            >
              <span className="material-icons-round" style={{ fontSize: '18px', marginRight: '8px' }}>camera_alt</span>
              Change Photo
            </button>
          )}
        </div>

        <input 
          type="file" id="profilePicInput" style={{ display: 'none' }} 
          accept="image/*" onChange={handleImageChange} 
        />

        {/* ── Action Bubbles ── */}
        <div className="profile-actions-elite">
          <div className="action-bubble" onClick={() => setIsEditing(!isEditing)} title={isEditing ? "Cancel" : "Edit Profile"}>
            <span className="material-icons-round">{isEditing ? 'close' : 'edit'}</span>
          </div>
          <div className={`action-bubble primary ${isSyncing ? 'syncing' : ''}`} onClick={handleSync} title="Sync Health Data">
            <span className="material-icons-round">sync</span>
          </div>
          <div className="action-bubble" title="Download Health Report">
            <span className="material-icons-round">file_download</span>
          </div>
        </div>
      </div>

      {/* ── Vitals Stats ── */}
      <div className="profile-stats-elite">
        <div className="stat-chip-elite">
          <span className="material-icons-round">cake</span>
          <span className="stat-value">{calculateAge(patient.birth_date)}</span>
          <span className="stat-label">Age</span>
        </div>
        <div className="stat-chip-elite">
          <span className="material-icons-round">water_drop</span>
          <span className="stat-value">{patient.blood_type || 'N/A'}</span>
          <span className="stat-label">Type</span>
        </div>
        <div className="stat-chip-elite">
          <span className="material-icons-round">monitor_weight</span>
          <span className="stat-value">{patient.weight || '--'} <small>kg</small></span>
          <span className="stat-label">Weight</span>
        </div>
      </div>

      <div className="profile-content-scroll-elite">
        {message && (
          <div style={{ margin: '0 0 1.5rem', textAlign: 'center', color: message.includes('Error') ? '#ff4d4d' : '#4ade80', fontWeight: 'bold' }}>
            {message}
          </div>
        )}

        {/* ── Personal Details ── */}
        <div className="profile-section-elite">
          <div className="section-header-elite">
            <h3><span className="material-icons-round">person_outline</span> Identity</h3>
          </div>
          
          <div className="info-row-elite">
            <div className="info-icon-elite"><span className="material-icons-round">alternate_email</span></div>
            <div className="info-content-elite">
              <label>Email Address</label>
              {isEditing ? (
                <input type="email" name="email" value={editData.email || ''} onChange={handleChange} className="profile-input-elite" />
              ) : (
                <p>{patient.email || 'No email provided'}</p>
              )}
            </div>
          </div>

          <div className="info-row-elite">
            <div className="info-icon-elite"><span className="material-icons-round">phone</span></div>
            <div className="info-content-elite">
              <label>Phone Number</label>
              {isEditing ? (
                <input type="tel" name="phone" value={editData.phone || ''} onChange={handleChange} className="profile-input-elite" />
              ) : (
                <p>{patient.phone || 'N/A'}</p>
              )}
            </div>
          </div>

          <div className="info-row-elite">
            <div className="info-icon-elite"><span className="material-icons-round">calendar_today</span></div>
            <div className="info-content-elite">
              <label>Birth Date</label>
              {isEditing ? (
                <input type="date" name="birth_date" value={editData.birth_date || ''} onChange={handleChange} className="profile-input-elite" />
              ) : (
                <p>{patient.birth_date || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Medical History ── */}
        <div className="profile-section-elite">
          <div className="section-header-elite">
            <h3><span className="material-icons-round">history</span> Medical Info</h3>
          </div>

          <div className="info-row-elite">
            <div className="info-icon-elite"><span className="material-icons-round">warning</span></div>
            <div className="info-content-elite">
              <label>Allergies & Conditions</label>
              {isEditing ? (
                <textarea name="allergies" value={editData.allergies || ''} onChange={handleChange} className="profile-input-elite" style={{ minHeight: '80px' }} />
              ) : (
                <p>{patient.allergies || 'No allergies listed'}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Emergency ── */}
        <div className="profile-section-elite emergency-elite">
          <div className="section-header-elite">
            <h3><span className="material-icons-round">contact_emergency</span> Emergency Contact</h3>
          </div>

          <div className="info-row-elite">
            <div className="info-icon-elite"><span className="material-icons-round">account_box</span></div>
            <div className="info-content-elite">
              <label>Contact Name</label>
              {isEditing ? (
                <input name="emergency_contact_name" value={editData.emergency_contact_name || ''} onChange={handleChange} className="profile-input-elite" />
              ) : (
                <p>{patient.emergency_contact_name || 'Not set'}</p>
              )}
            </div>
          </div>

          <div className="info-row-elite">
            <div className="info-icon-elite"><span className="material-icons-round">call</span></div>
            <div className="info-content-elite">
              <label>Contact Phone</label>
              {isEditing ? (
                <input name="emergency_contact_phone" value={editData.emergency_contact_phone || ''} onChange={handleChange} className="profile-input-elite" />
              ) : (
                <p>{patient.emergency_contact_phone || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="profile-save-bar">
          <button 
            className="btn-primary" 
            style={{ width: '100%', borderRadius: '20px', padding: '1.2rem', fontSize: '1rem', fontWeight: '800' }} 
            onClick={handleSave} 
            disabled={isSaving}
          >
            {isSaving ? 'Syncing Profile...' : 'Save Profile Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;

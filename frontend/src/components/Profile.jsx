import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/profile_elite.css';

const Profile = ({ patient, onUpdate, meds = [], userEvents = [], analysisHistory = [] }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...patient });
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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
        const data = await response.json();
        // If a new token was returned (due to username change), update it
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
          // Also update the username in storage if it exists
          if (localStorage.getItem('username')) {
            localStorage.setItem('username', data.username);
          }
        }
        
        // Update the patient object (onUpdate usually just triggers a state refresh)
        // Since we might have more fields now, we should re-fetch or use the return data
        // For simplicity, we just trigger the callback
        onUpdate({ ...patient, ...editData, username: data.username });
        
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

  const handleDownloadReport = () => {
    setIsDownloading(true);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // ── Header Banner ──
    doc.setFillColor(67, 97, 238);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text('Nexos Health Report', 14, 26);
    
    doc.setFontSize(10);
    doc.setTextColor(200, 210, 255);
    doc.text(`Official Medical Summary • ${new Date().toLocaleDateString()}`, 14, 33);
    
    // ── Meta Info (Right Aligned) ──
    doc.setFontSize(9);
    doc.text(`Patient ID: #NX-2026`, pageWidth - 14, 20, { align: 'right' });
    doc.text(`Doc Ref: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, pageWidth - 14, 25, { align: 'right' });
    
    let currentY = 55;

    // ── Patient Identity ──
    doc.setFontSize(14);
    doc.setTextColor(67, 97, 238);
    doc.text('Patient Identity', 14, currentY);
    doc.setDrawColor(67, 97, 238);
    doc.setLineWidth(0.5);
    doc.line(14, currentY + 2, 55, currentY + 2);
    
    autoTable(doc, {
      startY: currentY + 8,
      body: [
        ['Full Name', patient.full_name || patient.username],
        ['Email Address', patient.email || 'N/A'],
        ['Phone Number', patient.phone || 'N/A'],
        ['Date of Birth', patient.birth_date || 'N/A'],
        ['Current Age', `${calculateAge(patient.birth_date)} years`],
        ['Gender', patient.gender || 'Not Specified']
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: 'bold', textColor: [100, 100, 100], width: 40 } }
    });
    
    currentY = doc.lastAutoTable.finalY + 15;

    // ── Vitals & Biometrics ──
    doc.setFontSize(14);
    doc.setTextColor(67, 97, 238);
    doc.text('Vitals & Biometrics', 14, currentY);
    doc.line(14, currentY + 2, 65, currentY + 2);
    
    autoTable(doc, {
      startY: currentY + 8,
      head: [['Metric', 'Value Status']],
      body: [
        ['Blood Type', patient.blood_type || 'Unknown'],
        ['Weight', patient.weight ? `${patient.weight}kg` : 'N/A'],
        ['Height', patient.height ? `${patient.height}cm` : 'N/A'],
        ['Allergies', patient.allergies || 'No allergies recorded']
      ],
      theme: 'striped',
      headStyles: { fillColor: [67, 97, 238], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 }
    });
    
    currentY = doc.lastAutoTable.finalY + 15;

    // ── Medications ──
    doc.setFontSize(14);
    doc.setTextColor(67, 97, 238);
    doc.text('Medication Regimen', 14, currentY);
    doc.line(14, currentY + 2, 65, currentY + 2);
    
    if (meds.length > 0) {
      autoTable(doc, {
        startY: currentY + 8,
        head: [['Medication', 'Dosage', 'Frequency', 'Stock']],
        body: meds.map(m => [m.name, m.dosage, m.frequency, `${m.stock} doses`]),
        headStyles: { fillColor: [67, 97, 238], fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 3 }
      });
      currentY = doc.lastAutoTable.finalY + 15;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('No active medications currently on record.', 14, currentY + 12);
      currentY += 22;
    }
    
    // ── Upcoming Health Plans ──
    if (currentY > 230) { doc.addPage(); currentY = 25; }
    doc.setFontSize(14);
    doc.setTextColor(67, 97, 238);
    doc.text('Upcoming Health Plans', 14, currentY);
    doc.line(14, currentY + 2, 75, currentY + 2);
    
    if (userEvents.length > 0) {
      autoTable(doc, {
        startY: currentY + 8,
        head: [['Plan/Event', 'Scheduled Date', 'Type', 'Location']],
        body: userEvents.map(e => [
          e.title, 
          new Date(e.appointment_date).toLocaleDateString(),
          e.type,
          e.location || 'N/A'
        ]),
        headStyles: { fillColor: [67, 97, 238], fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 3 }
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('No upcoming health plans scheduled.', 14, currentY + 12);
    }

    // ── Footer ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.setDrawColor(240);
      doc.line(14, 280, pageWidth - 14, 280);
      doc.text(`Page ${i} of ${pageCount} — Nexos Elite Medical Summary`, 14, 287);
      doc.text(`Nexos AI Health Assistant • Privacy Protected`, pageWidth - 14, 287, { align: 'right' });
    }
    
    doc.save(`Nexos_Health_Report_${patient.username}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    setMessage('Professional PDF report downloaded!');
    setTimeout(() => {
      setMessage('');
      setIsDownloading(false);
    }, 3000);
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
        <img 
          src={(isEditing ? editData.profile_picture : patient.profile_picture) || (patient?.gender?.toLowerCase() === 'female' ? '/female.png' : '/male.png')} 
          className="profile-hero-image"
          alt="Profile Background" 
        />
        
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
          <div className={`action-bubble ${isDownloading ? 'downloading' : ''}`} onClick={handleDownloadReport} title="Download Health Report">
            <span className="material-icons-round">{isDownloading ? 'hourglass_top' : 'file_download'}</span>
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
            <div className="info-icon-elite"><span className="material-icons-round">account_circle</span></div>
            <div className="info-content-elite">
              <label>User Name</label>
              {isEditing ? (
                <input type="text" name="username" value={editData.username || ''} onChange={handleChange} className="profile-input-elite" />
              ) : (
                <p>{patient.username}</p>
              )}
            </div>
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

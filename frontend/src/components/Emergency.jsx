import React, { useState, useEffect } from 'react';
import '../styles/main.css';
import CprGuideModal from './CprGuideModal';

const Emergency = ({ patient, autoEngaged = false }) => {
    const [hospitalsFetching, setHospitalsFetching] = useState(false);
    const [hospitalError, setHospitalError] = useState('');
    const [alertStatus, setAlertStatus] = useState(autoEngaged ? 'ENGAGING PROTOCOL...' : 'IDLE');
    const [showCprModal, setShowCprModal] = useState(false);

    useEffect(() => {
        if (autoEngaged) {
            // Simulate the automatic dialing / alerting sequence
            let timer = setTimeout(() => {
                setAlertStatus('NOTIFIED!');
                // Attempt to theoretically fire a call
                if (patient?.emergency_contact_phone) {
                    window.location.href = `tel:${patient.emergency_contact_phone}`;
                }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [autoEngaged, patient]);

    const handleRouteHospitals = () => {
        setHospitalsFetching(true);
        setHospitalError('');
        if (!navigator.geolocation) {
            setHospitalError('Geolocation is not supported by your browser.');
            setHospitalsFetching(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const mapsUrl = `https://www.google.com/maps/search/hospitals+near+me/@${latitude},${longitude},14z`;
                window.open(mapsUrl, '_blank');
                setHospitalsFetching(false);
            },
            (err) => {
                setHospitalError('Unable to retrieve location. Please check your browser permissions.');
                setHospitalsFetching(false);
                // Fallback generic search
                window.open('https://www.google.com/maps/search/hospitals+near+me', '_blank');
            }
        );
    };

    return (
        <div className="emergency-section slide-in-top">
            <div className="emergency-header">
                <div className="emergency-header-title">
                    <div className="pulse-ring-container">
                        <div className="pulse-dot"></div>
                        <div className="pulse-ring"></div>
                        <div className="pulse-ring delay"></div>
                    </div>
                    <div>
                        <h2>Emergency Response</h2>
                        <p className="ux-prompt-small emergency-prompt">Immediate assistance and essential routing.</p>
                    </div>
                </div>
                {autoEngaged && (
                    <div className="urgent-badge fade-in">
                        <span className="material-icons-round blink-icon">warning</span>
                        SYSTEM OVERRIDE: {alertStatus}
                    </div>
                )}
            </div>

            <div className="emergency-grid">
                {/* Personal Emergency Contacts */}
                <div className="emergency-card glass-modal">
                    <div className="card-top">
                        <div className="emergency-icon-box personal">
                            <span className="material-icons-round">contact_emergency</span>
                        </div>
                        <h3>Personal Contact</h3>
                    </div>
                    <div className="contact-info">
                        <h4>{patient?.emergency_contact_name || 'No Emergency Contact Set'}</h4>
                        <p>{patient?.emergency_contact_phone || 'Please update in profile'}</p>
                    </div>
                    {patient?.emergency_contact_phone && (
                        <a href={`tel:${patient.emergency_contact_phone}`} className="btn-emergency btn-outline">
                            <span className="material-icons-round">call</span>
                            Call Now
                        </a>
                    )}
                </div>

                {/* Official Emergency Numbers */}
                <div className="emergency-card glass-modal">
                    <div className="card-top">
                        <div className="emergency-icon-box official">
                            <span className="material-icons-round">local_police</span>
                        </div>
                        <h3>Official Services</h3>
                    </div>
                    <div className="official-list">
                        <div className="official-item">
                            <span>General / Police</span>
                            <strong>911</strong>
                            <a href="tel:911" className="call-mini"><span className="material-icons-round">dialpad</span></a>
                        </div>
                        <div className="official-item">
                            <span>Ambulance</span>
                            <strong>911</strong>
                            <a href="tel:911" className="call-mini"><span className="material-icons-round">dialpad</span></a>
                        </div>
                        <div className="official-item">
                            <span>Poison Control</span>
                            <strong>1-800-222-1222</strong>
                            <a href="tel:1-800-222-1222" className="call-mini"><span className="material-icons-round">dialpad</span></a>
                        </div>
                    </div>
                </div>

                {/* Nearest Hospital Routing */}
                <div className="emergency-card routing-card glass-modal">
                    <div className="card-top">
                        <div className="emergency-icon-box routing">
                            <span className="material-icons-round">local_hospital</span>
                        </div>
                        <h3>Hospital Routing</h3>
                    </div>
                    <div className="routing-body">
                        <span className="material-icons-round map-icon bg">map</span>
                        <p>Instantly find and navigate to the nearest active hospital facilities in your area.</p>
                        {hospitalError && <p className="hospital-error">{hospitalError}</p>}
                        
                        <button 
                            className={`btn-emergency inline-btn ${hospitalsFetching ? 'loading' : ''}`} 
                            onClick={handleRouteHospitals}
                            disabled={hospitalsFetching}
                        >
                            <span className="material-icons-round">near_me</span>
                            {hospitalsFetching ? 'Locating...' : 'Navigate to Nearest'}
                        </button>
                    </div>
                </div>

                {/* CPR Guide Card */}
                <div className="emergency-card cpr-card glass-modal cursor-pointer" onClick={() => setShowCprModal(true)}>
                    <div className="card-top">
                        <div className="emergency-icon-box cpr">
                            <span className="material-icons-round">medical_information</span>
                        </div>
                        <h3>CPR Resuscitation</h3>
                    </div>
                    <div className="cpr-body">
                        <span className="material-icons-round cpr-icon bg">heart_broken</span>
                        <p>Interactive CPR instruction walkthrough with built-in metronome (110 BPM) and hands-only mode.</p>
                        <button className="btn-emergency btn-cpr-action" onClick={(e) => { e.stopPropagation(); setShowCprModal(true); }}>
                            <span className="material-icons-round">play_arrow</span>
                            Start CPR Guide
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="emergency-info-box">
                <span className="material-icons-round">info</span>
                <p>If you are experiencing a life-threatening medical emergency, do not wait. Call your local emergency dispatch immediately.</p>
            </div>

            {/* CPR Resuscitation Guide Modal */}
            <CprGuideModal 
                isOpen={showCprModal} 
                onClose={() => setShowCprModal(false)} 
                patient={patient} 
            />
        </div>
    );
};

export default Emergency;

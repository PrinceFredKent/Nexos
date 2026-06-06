import React, { useState, useEffect, useRef } from 'react';
import '../styles/main.css';

const CprGuideModal = ({ isOpen, onClose, patient }) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [handsOnly, setHandsOnly] = useState(false);
    const [metronomeActive, setMetronomeActive] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const audioCtxRef = useRef(null);
    const intervalRef = useRef(null);

    // List of steps. Step 5 (Rescue Breaths) is skipped if handsOnly is true.
    const allSteps = [
        {
            id: 'scene_safety',
            title: '1. Check the Scene & Patient',
            desc: 'Verify the environment is safe. Firmly tap the person\'s shoulder and shout: "Are you OK?"',
            svg: (
                <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Floor/Ground */}
                    <line x1="10" y1="105" x2="190" y2="105" stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
                    
                    {/* Patient Lying Down */}
                    <g transform="translate(20, 30)">
                        {/* Body Outline */}
                        <path d="M 10 65 L 120 65" stroke="var(--text-muted)" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
                        {/* Pillow/Headrest */}
                        <rect x="0" y="58" width="12" height="8" rx="2" fill="var(--border)" />
                        {/* Head */}
                        <circle cx="18" cy="52" r="10" stroke="var(--text-main)" strokeWidth="2" fill="var(--bg-card)" />
                        {/* Chest/Torso */}
                        <path d="M 32 60 Q 55 52 80 60" stroke="var(--text-main)" strokeWidth="2.5" fill="none" />
                        {/* Legs */}
                        <path d="M 80 60 L 130 65" stroke="var(--text-main)" strokeWidth="2" />
                    </g>

                    {/* Rescuer Kneeling & Tapping */}
                    <g transform="translate(65, 15)">
                        {/* Head */}
                        <circle cx="50" cy="22" r="9" stroke="var(--primary)" strokeWidth="2" fill="var(--bg-card)" />
                        {/* Torso leaning forward */}
                        <path d="M 50 31 C 45 42, 35 55, 30 68" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Knees on ground */}
                        <path d="M 30 68 L 15 75 C 15 75, 18 80, 28 78 L 48 70" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
                        {/* Arms reaching to tap shoulder */}
                        <path d="M 45 35 L 22 55" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" className="svg-animate-compress" />
                        {/* Tap Impact lines */}
                        <g className="svg-pulse-glow" transform="translate(18, 55)">
                            <path d="M-4 -4 L0 0 M4 -4 L0 0 M-4 4 L0 0 M4 4 L0 0" stroke="#f43f5e" strokeWidth="1.5" />
                        </g>
                    </g>
                </svg>
            )
        },
        {
            id: 'call_help',
            title: '2. Call 911 & Get AED',
            desc: 'If patient is unresponsive, shout for help. Call 911 immediately. If available, send someone to fetch an AED.',
            svg: (
                <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Phone/Calling Graphic */}
                    <g transform="translate(25, 20)">
                        <rect x="0" y="0" width="45" height="80" rx="8" fill="var(--bg-card)" stroke="var(--text-main)" strokeWidth="2" />
                        <rect x="5" y="8" width="35" height="52" rx="3" fill="rgba(67, 97, 238, 0.05)" />
                        {/* Home Button */}
                        <circle cx="22.5" cy="70" r="3" stroke="var(--text-main)" strokeWidth="1.5" />
                        
                        {/* Call Icon / Text inside Screen */}
                        <path d="M 17 28 Q 22.5 25 28 28 L 28 36 Q 22.5 33 17 36 Z" fill="#ef4444" />
                        <text x="22.5" y="50" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">911</text>
                        
                        {/* Signal waves */}
                        <path d="M 52 25 A 15 15 0 0 1 52 55" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" className="svg-pulse-glow" />
                        <path d="M 58 18 A 25 25 0 0 1 58 62" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.6" className="svg-pulse-glow" />
                    </g>

                    {/* AED Cabinet Graphic */}
                    <g transform="translate(115, 20)">
                        <rect x="0" y="0" width="55" height="75" rx="10" fill="var(--bg-card)" stroke="var(--border)" strokeWidth="2" />
                        {/* Heart + Lightning bolt inside AED */}
                        <rect x="10" y="10" width="35" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="1.5" />
                        {/* Heart symbol */}
                        <path d="M 27.5 24 C 23.5 19, 18 22, 27.5 34 C 37 22, 31.5 19, 27.5 24 Z" fill="#10b981" />
                        {/* Lightning bolt overlay */}
                        <path d="M 28 20 L 23 29 L 27 29 L 26 35 L 32 26 L 28 26 Z" fill="#fff" />
                        {/* Red flashing indicator */}
                        <circle cx="45" cy="5" r="4" fill="#ef4444" className="svg-pulse-glow" />
                        <text x="27.5" y="62" fill="var(--text-main)" fontSize="7" fontWeight="bold" textAnchor="middle">AED</text>
                    </g>
                </svg>
            )
        },
        {
            id: 'check_breathing',
            title: '3. Check Breathing',
            desc: 'Look, listen, and feel for normal breathing. Scan the chest for rise and fall (takes no more than 10 seconds).',
            svg: (
                <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Patient Head & Chest outline */}
                    <g transform="translate(10, 45)">
                        {/* Neck/Shoulders */}
                        <path d="M 60 45 L 85 45 Q 115 32 145 45 L 180 45" stroke="var(--text-main)" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Chest expansion area */}
                        <path d="M 115 32 Q 130 18 145 32" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" className="svg-animate-breath" />
                        {/* Face side profile */}
                        <path d="M 60 45 L 50 35 L 45 37 L 40 32 L 35 32 L 30 25 L 35 15 L 50 15 L 60 25 Z" fill="var(--bg-card)" stroke="var(--text-main)" strokeWidth="2" />
                    </g>

                    {/* Rescuer Listening Position */}
                    <g transform="translate(60, 5)">
                        {/* Rescuer Head tilted over mouth */}
                        <circle cx="50" cy="30" r="10" stroke="var(--primary)" strokeWidth="2" fill="var(--bg-card)" />
                        {/* Arrow showing look direction towards chest */}
                        <path d="M 55 35 L 90 65" stroke="var(--primary)" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
                        <path d="M 85 65 L 90 65 L 90 60" stroke="var(--primary)" strokeWidth="2" />
                        {/* Ear listening at mouth indicator */}
                        <path d="M 42 32 A 4 4 0 0 0 38 36" stroke="#f43f5e" strokeWidth="1.5" />
                    </g>
                </svg>
            )
        },
        {
            id: 'compressions',
            title: '4. Chest Compressions',
            desc: 'Place hands in the center of the chest. Compress hard and fast (2 inches deep, 100-120 BPM). Let chest recoil.',
            svg: (
                <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Chest Cross-section or Hand placement */}
                    <g transform="translate(100, 60)">
                        {/* Metronome anchor (visual pulse) */}
                        <circle cx="0" cy="0" r="28" fill="rgba(244, 63, 94, 0.05)" stroke="rgba(244, 63, 94, 0.2)" strokeWidth="1" />
                        
                        {/* Underlay bones/sternum guide */}
                        <line x1="-35" y1="0" x2="35" y2="0" stroke="var(--border)" strokeWidth="1.5" opacity="0.3" />
                        <line x1="0" y1="-35" x2="0" y2="35" stroke="var(--border)" strokeWidth="1.5" opacity="0.3" />
                        
                        {/* Interlocked Hands illustration */}
                        <g className="svg-animate-compress">
                            {/* Bottom hand palm */}
                            <path d="M -16 -6 C -22 -15, -10 -22, -2 -12 L 8 -16 C 14 -12, 10 -4, 2 -4 Z" fill="var(--bg-card)" stroke="var(--text-main)" strokeWidth="2" />
                            {/* Top hand interlocking fingers */}
                            <path d="M -10 -8 C -14 -4, -6 12, 10 4 C 18 -2, 6 -15, -2 -10 Z" fill="var(--primary-light)" stroke="var(--primary)" strokeWidth="2" />
                            {/* Force direction arrows */}
                            <path d="M 0 -45 L 0 -25" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                            <path d="M -5 -30 L 0 -25 L 5 -30" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                    </g>
                </svg>
            )
        },
        {
            id: 'rescue_breaths',
            title: '5. Rescue Breaths',
            desc: 'Tilt head back, lift chin. Pinch the nose shut, seal your mouth over theirs, and blow twice to make the chest rise.',
            svg: (
                <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Head Tilt / Chin Lift illustration */}
                    <g transform="translate(40, 25)">
                        {/* Face tilted back */}
                        <path d="M 40 50 Q 30 25 50 15 Q 70 8 85 20 Q 95 30 115 32 L 120 40 L 110 50 Z" fill="var(--bg-card)" stroke="var(--text-main)" strokeWidth="2.5" />
                        {/* Airway pathway tube graphic */}
                        <path d="M 68 22 Q 85 24 92 34" stroke="#10b981" strokeWidth="3" strokeLinecap="round" className="svg-pulse-glow" />
                        
                        {/* Hand tilting forehead */}
                        <path d="M 32 10 Q 42 16 52 14" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Hand lifting chin */}
                        <path d="M 108 55 Q 112 40 102 38" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
                        
                        {/* Nose Pinch indicator */}
                        <circle cx="78" cy="12" r="5" stroke="#ef4444" strokeWidth="1.5" fill="none" className="svg-pulse-glow" />
                        <path d="M 75 9 L 81 15" stroke="#ef4444" strokeWidth="1.5" />
                    </g>
                </svg>
            )
        },
        {
            id: 'repeat_cycle',
            title: '6. Repeat & Keep Going',
            desc: 'Perform 30 compressions followed by 2 rescue breaths. Continue until EMS arrives or victim revives.',
            svg: (
                <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Cyclic Repeat arrows */}
                    <circle cx="100" cy="60" r="40" stroke="var(--border)" strokeWidth="3" strokeDasharray="6 6" />
                    <g transform="translate(100, 60)">
                        {/* Arrow 1 */}
                        <path d="M -40 0 A 40 40 0 0 1 32 -24" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
                        <path d="M 25 -25 L 32 -24 L 32 -17" stroke="var(--primary)" strokeWidth="3" />
                        {/* Arrow 2 */}
                        <path d="M 40 0 A 40 40 0 0 1 -32 24" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                        <path d="M -25 25 L -32 24 L -32 17" stroke="#f43f5e" strokeWidth="3" />
                        
                        {/* Central Icons */}
                        {/* Compressions Symbol */}
                        <g transform="translate(-16, -10)">
                            <path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="#f43f5e" strokeWidth="2.5" />
                            <text x="0" y="15" fill="var(--text-main)" fontSize="7" fontWeight="bold" textAnchor="middle">30 PUSH</text>
                        </g>
                        {/* Breath Symbol */}
                        <g transform="translate(16, 5)">
                            <path d="M -6 0 C -6 -5, 6 -5, 6 0 C 6 5, -6 5, -6 0" stroke="var(--primary)" strokeWidth="2" fill="none" />
                            <text x="0" y="12" fill="var(--text-main)" fontSize="7" fontWeight="bold" textAnchor="middle">2 BREATH</text>
                        </g>
                    </g>
                </svg>
            )
        }
    ];

    // Filter steps based on Hands-Only Mode
    const steps = handsOnly 
        ? allSteps.filter(s => s.id !== 'rescue_breaths') 
        : allSteps;

    // Adjust step detail in last step description if Hands-Only
    if (handsOnly) {
        const lastStep = steps[steps.length - 1];
        if (lastStep && lastStep.id === 'repeat_cycle') {
            lastStep.desc = 'Perform continuous chest compressions (100-120 BPM) with NO rescue breaths. Keep pushing until help arrives.';
        }
    } else {
        const lastStep = steps[steps.length - 1];
        if (lastStep && lastStep.id === 'repeat_cycle') {
            lastStep.desc = 'Perform 30 compressions followed by 2 rescue breaths. Repeat this cycle until medical help arrives.';
        }
    }

    const currentStep = steps[currentStepIndex] || steps[0];

    // Audio Metronome Logic using Web Audio API (completely offline-friendly)
    useEffect(() => {
        // Stop metronome sound loop
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const isMetronomeStep = currentStep.id === 'compressions' || currentStep.id === 'repeat_cycle';

        if (isOpen && isMetronomeStep && metronomeActive) {
            // Setup interval (110 BPM -> 545.45 ms interval)
            const bpm = 110;
            const intervalTime = (60 / bpm) * 1000;

            intervalRef.current = setInterval(() => {
                if (soundEnabled) {
                    playBeep();
                }
            }, intervalTime);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [currentStepIndex, metronomeActive, soundEnabled, isOpen, handsOnly]);

    // Cleanup audio context on unmount
    useEffect(() => {
        return () => {
            if (audioCtxRef.current) {
                audioCtxRef.current.close();
                audioCtxRef.current = null;
            }
        };
    }, []);

    const playBeep = () => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const audioCtx = audioCtxRef.current;
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            // High pitch short beep
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
            osc.type = 'sine';

            // Clean click/beep envelope
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            console.warn("Metronome sound playing failed: ", e);
        }
    };

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    const handleRestart = () => {
        setCurrentStepIndex(0);
    };

    const handleHandsOnlyToggle = () => {
        setHandsOnly(prev => {
            const newVal = !prev;
            // If toggling, reset step index to start to prevent index overflow
            setCurrentStepIndex(0);
            return newVal;
        });
    };

    if (!isOpen) return null;

    const isMetronomeActiveStep = currentStep.id === 'compressions' || currentStep.id === 'repeat_cycle';

    return (
        <div className="modal-overlay emergency-overlay fade-in" onClick={onClose}>
            <div className="modal-content glass-modal critical-modal slide-in-top" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '92%' }}>
                <div className="modal-header" style={{ paddingBottom: '0.8rem' }}>
                    <div className="header-title-group" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="material-icons-round" style={{ color: '#f43f5e', fontSize: '2rem' }}>favorite</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>CPR Resuscitation Guide</h2>
                            <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>Follow the steps and rhythm</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <span className="material-icons-round">close</span>
                    </button>
                </div>

                <div className="cpr-modal-container">
                    {/* Step indicator bullets */}
                    <div className="cpr-step-indicator-dots">
                        {steps.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`cpr-indicator-dot ${idx === currentStepIndex ? 'active' : ''}`}
                            />
                        ))}
                    </div>

                    {/* Step Content / Illustrator frame */}
                    <div className="cpr-slide-wrapper">
                        <div className="cpr-illustration-box">
                            {currentStep.svg}

                            {/* Metronome wave & audio toggle overlay */}
                            {isMetronomeActiveStep && (
                                <>
                                    {metronomeActive && (
                                        <div className={`metronome-visual-anchor ${metronomeActive ? 'metronome-active' : ''}`}>
                                            <div className="cpr-metronome-wave"></div>
                                            <div className="metronome-outer-ring"></div>
                                        </div>
                                    )}

                                    <div 
                                        className={`metronome-sound-status ${soundEnabled ? 'active' : ''}`}
                                        onClick={() => setSoundEnabled(!soundEnabled)}
                                    >
                                        <span className="material-icons-round" style={{ fontSize: '0.9rem' }}>
                                            {soundEnabled ? 'volume_up' : 'volume_off'}
                                        </span>
                                        <span>{soundEnabled ? 'Sound On (110 BPM)' : 'Mute'}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="cpr-instructions">
                            <h3 className="cpr-step-title">{currentStep.title}</h3>
                            <p className="cpr-step-desc">{currentStep.desc}</p>
                        </div>
                    </div>

                    {/* Hands-Only Switch */}
                    <div className="cpr-controls-row">
                        <div className="cpr-toggle-label">
                            <span className="cpr-toggle-title">Hands-Only CPR</span>
                            <span className="cpr-toggle-sub">Skip rescue breaths (recommended if untrained)</span>
                        </div>
                        <label className="switch" style={{ margin: 0 }}>
                            <input 
                                type="checkbox" 
                                checked={handsOnly} 
                                onChange={handleHandsOnlyToggle} 
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    {/* Footer buttons */}
                    <div className="cpr-modal-footer">
                        <div className="cpr-nav-buttons">
                            {currentStepIndex > 0 ? (
                                <button className="btn-cpr-nav back" onClick={handleBack}>
                                    <span className="material-icons-round">arrow_back</span>
                                    Back
                                </button>
                            ) : (
                                <button className="btn-cpr-nav back" onClick={onClose}>
                                    Cancel
                                </button>
                            )}

                            {currentStepIndex < steps.length - 1 ? (
                                <button className="btn-cpr-nav next" onClick={handleNext}>
                                    Next Step
                                    <span className="material-icons-round">arrow_forward</span>
                                </button>
                            ) : (
                                <button className="btn-cpr-nav next" onClick={handleRestart}>
                                    <span className="material-icons-round">replay</span>
                                    Start Over
                                </button>
                            )}
                        </div>

                        {/* Call overlay option */}
                        <a href="tel:911" className="btn-cpr-nav urgent-call">
                            <span className="material-icons-round">phone_in_talk</span>
                            Call 911 Speakerphone
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CprGuideModal;

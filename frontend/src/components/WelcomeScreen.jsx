import React, { useState, useEffect, useRef } from 'react';
import '../styles/welcome.css';
import loginImg  from '../assets/img/login.jpg';
import signup1   from '../assets/img/signup1.jpg';
import signup2   from '../assets/img/signup2.jpg';
import signup3   from '../assets/img/signup3.jpg';

const SLIDES = [loginImg, signup1, signup2, signup3];

const WelcomeScreen = ({ onProceed }) => {
  const [phase, setPhase] = useState('logo');   // 'logo' | 'reveal' | 'full'
  const [imgIndex, setImgIndex] = useState(0);

  // Phase timeline
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 1800);  // logo → slide up
    const t2 = setTimeout(() => setPhase('full'),   2600);  // slide finishes
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Background image carousel
  useEffect(() => {
    const iv = setInterval(() => setImgIndex(i => (i + 1) % SLIDES.length), 3500);
    return () => clearInterval(iv);
  }, []);

  // ── Slide-to-proceed logic ────────────────────────────────────────────────
  const trackRef  = useRef(null);
  const thumbRef  = useRef(null);
  const startXRef = useRef(null);
  const curXRef   = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);   // 0-100
  const [done, setDone]         = useState(false);

  const getTrackWidth = () => {
    if (!trackRef.current || !thumbRef.current) return 1;
    return trackRef.current.offsetWidth - thumbRef.current.offsetWidth - 8;
  };

  const startDrag = (clientX) => {
    if (done) return;
    startXRef.current = clientX;
    setDragging(true);
  };

  const moveDrag = (clientX) => {
    if (!dragging || startXRef.current === null) return;
    const delta = clientX - startXRef.current;
    const maxW  = getTrackWidth();
    const pct   = Math.min(100, Math.max(0, (delta / maxW) * 100));
    curXRef.current = pct;
    setProgress(pct);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    if (curXRef.current >= 85) {
      setProgress(100);
      setDone(true);
      setTimeout(onProceed, 400);
    } else {
      setProgress(0);
      curXRef.current = 0;
    }
  };

  // Touch events
  const onTouchStart = (e) => startDrag(e.touches[0].clientX);
  const onTouchMove  = (e) => moveDrag(e.touches[0].clientX);
  const onTouchEnd   = ()  => endDrag();

  // Mouse events (desktop)
  const onMouseDown  = (e) => startDrag(e.clientX);
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => moveDrag(e.clientX);
    const up   = ()  => endDrag();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup',   up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup',   up);
    };
  }, [dragging]);

  const thumbX = `calc(${progress}% * ${getTrackWidth ? 1 : 1}px)`;

  return (
    <div className={`welcome-screen phase-${phase}`}>
      {/* Animated Mesh Layer */}
      <div className="welcome-mesh" />

      {/* ── Sliding background images ── */}
      {SLIDES.map((src, i) => (
        <div
          key={i}
          className={`welcome-bg-slide ${i === imgIndex ? 'active' : ''}`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}

      {/* Dark overlay */}
      <div className="welcome-overlay" />

      {/* ── Logo (centres then slides up) ── */}
      <div className="welcome-logo-wrap">
        <div className="welcome-logo-bubble">
          <img src="/logo.png" alt="Nexos" />
        </div>
        <span className="welcome-brand">NEXOS</span>
      </div>

      {/* ── Bottom content (fades in after reveal) ── */}
      <div className="welcome-content">
        <h1 className="welcome-headline">Your Health,<br/>Intelligently Unified.</h1>
        <p className="welcome-sub">Track symptoms, manage medications, and get AI-powered insights — all in one place.</p>

        {/* ── Slide-to-proceed track ── */}
        <div
          ref={trackRef}
          className={`slide-track ${done ? 'done' : ''}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Fill bar */}
          <div
            className="slide-fill"
            style={{ width: `calc(${progress}% + 60px)` }}
          />

          {/* Thumb */}
          <div
            ref={thumbRef}
            className={`slide-thumb ${dragging ? 'dragging' : ''}`}
            style={{ left: `calc(6px + ${progress / 100} * (100% - 64px))` }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <span className="material-icons-round" style={{ fontSize: '28px' }}>
              {done ? 'check' : 'chevron_right'}
            </span>
          </div>

          <span className="slide-label" style={{ opacity: 1 - progress / 60 }}>
            Slide to get started
          </span>
        </div>
      </div>

      {/* ── Desktop Content ── */}
      <div className="welcome-desktop-wrap">
        <div className="desktop-hero-section">
          <div className="desktop-hero-left">
            <h1 className="desktop-headline fade-in-up">Your Health,<br/><span>Intelligently Unified.</span></h1>
            <p className="desktop-subline fade-in-up delay-1">
              Nexos synthesizes your vitals, symptoms, and medications into a unified clinical dashboard. 
              Experience the next generation of personalized healthcare.
            </p>
            
            <div className="desktop-feature-grid fade-in-up delay-2">
              <div className="feature-card-mini">
                <span className="material-icons-round">biotech</span>
                <p>AI Symptom Analysis</p>
              </div>
              <div className="feature-card-mini">
                <span className="material-icons-round">medication_liquid</span>
                <p>Smart Reminders</p>
              </div>
              <div className="feature-card-mini">
                <span className="material-icons-round">security</span>
                <p>Privacy Protected</p>
              </div>
            </div>

            <button className="btn-get-started-desktop fade-in-up delay-3" onClick={onProceed}>
              <span>Enter Dashboard</span>
              <div className="btn-icon">
                <span className="material-icons-round">arrow_forward</span>
              </div>
            </button>
          </div>

          <div className="desktop-hero-right">
            <div className="image-card-stack fade-in-right">
              {SLIDES.map((src, i) => (
                <div
                  key={i}
                  className={`image-card-item ${i === imgIndex ? 'active' : ''}`}
                  style={{ backgroundImage: `url(${src})`, zIndex: i === imgIndex ? 5 : 1 }}
                >
                  <div className="card-glass-overlay"></div>
                </div>
              ))}
              
              {/* Decorative elements */}
              <div className="stack-decoration-ring"></div>
              <div className="stack-decoration-dots"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
